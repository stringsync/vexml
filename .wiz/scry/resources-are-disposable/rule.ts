import type {
	Decider,
	Finding,
	Rule,
	SourceFile,
	SyntaxNode,
	Tools,
} from "@webappwiz/scry";

/**
 * Finds what holds a resource without `Resource`: a class taking a timer,
 * listener, socket or handle with no `dispose`, a release under another
 * name, a method handing out an id another method cancels, and a `dispose`
 * looping over its own lists of things to release.
 */
export default class ResourcesAreDisposable implements Rule {
	static readonly description =
		"Whatever holds a timer, listener, socket or handle implements Resource and releases it in dispose.";
	static readonly files = "**/*.{ts,tsx}";
	static readonly level = "error";
	static readonly recommended = true;

	private som: Decider;

	constructor(tools: Tools) {
		this.som = tools.som;
	}

	async check(file: SourceFile): Promise<Finding[]> {
		const holders = file.ts.findAll({
			rule: {
				any: [
					{ kind: "class_declaration" },
					{ kind: "abstract_class_declaration" },
					{ kind: "interface_declaration" },
				],
			},
		});
		return [
			...this.resourcesWithNoWayOut(holders),
			...(await this.releasesUnderAnotherName(holders)),
			...this.idsHandedOut(holders),
			...this.handRolledBookkeeping(holders),
		].toSorted((left, right) => left.line - right.line);
	}

	/** A class that takes a resource, and has no way to release it by any name. */
	private resourcesWithNoWayOut(holders: SyntaxNode[]): Finding[] {
		return holders
			.filter((holder) => !holder.is("interface_declaration"))
			.filter(
				(holder) =>
					!hasDispose(holder) &&
					otherNames(holder).length === 0 &&
					acquisitions(holder).length > 0,
			)
			.map((holder) =>
				holder.flag(
					`${nameOf(holder)} takes a resource with ${acquisitions(holder)[0]} and offers no way to release it: implement Resource and release it in dispose().`,
				),
			);
	}

	/**
	 * A `close()`, `stop()` or the like on something with no `dispose`.
	 * When the class visibly takes a resource, the method is its release;
	 * otherwise the som reads whether it releases anything.
	 */
	private async releasesUnderAnotherName(
		holders: SyntaxNode[],
	): Promise<Finding[]> {
		const candidates = holders
			.filter((holder) => !hasDispose(holder))
			.flatMap((holder) =>
				otherNames(holder).map((method) => ({ holder, method })),
			);
		return Promise.all(
			candidates.map(async ({ holder, method }) => {
				const name = method.field("name")?.text;
				const message = `${name}() is a release under another name: implement Resource and call it dispose().`;
				if (acquisitions(holder).length > 0) {
					return method.flag(message);
				}
				const question = `Does ${name}() release something ${nameOf(holder)} holds, like a timer, listener, subscription, socket, worker or file handle?`;
				return method.flag(
					message,
					await this.som.decide(question, holder),
					question,
				);
			}),
		);
	}

	/**
	 * A method returning the very type another method takes to cancel it:
	 * an id where a `Resource` belongs. A plain `number` or `string` counts
	 * only from a method taking a function to run, like a timer's.
	 */
	private idsHandedOut(holders: SyntaxNode[]): Finding[] {
		return holders.flatMap((holder) => {
			const methods = methodsOf(holder);
			const cancelled = new Set(
				methods
					.filter((method) => CANCELS.test(method.field("name")?.text ?? ""))
					.map((method) => parameterTypes(method))
					.filter((types) => types.length === 1)
					.map((types) => types[0]),
			);
			return methods
				.filter((method) => {
					const returned = returnType(method);
					return (
						returned !== undefined &&
						cancelled.has(returned) &&
						(!PRIMITIVES.has(returned) || takesFunction(method))
					);
				})
				.map((method) =>
					method.flag(
						`${method.field("name")?.text} hands out a ${returnType(method)} that another method cancels: return a Resource instead.`,
					),
				);
		});
	}

	/** A `dispose` looping over the holder's own lists, where a `Disposer` belongs. */
	private handRolledBookkeeping(holders: SyntaxNode[]): Finding[] {
		return holders.flatMap((holder) =>
			methodsOf(holder)
				.filter((method) => DISPOSE.has(method.field("name")?.text ?? ""))
				.filter(
					(method) =>
						method.findAll({
							rule: {
								any: [
									{
										kind: "for_in_statement",
										has: { field: "right", pattern: "this.$FIELD" },
									},
									{ pattern: "this.$FIELD.forEach($$$)" },
								],
							},
						}).length > 0,
				)
				.map((method) =>
					method.flag(
						`${nameOf(holder)} keeps its own lists of things to release: own a Disposer and register each as it is taken.`,
					),
				),
		);
	}
}

function nameOf(holder: SyntaxNode): string {
	return holder.field("name")?.text ?? "This class";
}

/** The methods of a class, or the method signatures of an interface. */
function methodsOf(holder: SyntaxNode): SyntaxNode[] {
	return (holder.field("body")?.children() ?? []).filter((member) =>
		member.is(
			"method_definition",
			"method_signature",
			"abstract_method_signature",
		),
	);
}

/** Whether it has a `dispose` or `disposeAsync`, as a method or a field. */
function hasDispose(holder: SyntaxNode): boolean {
	return (holder.field("body")?.children() ?? []).some(
		(member) =>
			member.is(
				"method_definition",
				"method_signature",
				"abstract_method_signature",
				"public_field_definition",
				"property_signature",
			) && DISPOSE.has(member.field("name")?.text ?? ""),
	);
}

/** The methods that take nothing and go by a release's other names. */
function otherNames(holder: SyntaxNode): SyntaxNode[] {
	return methodsOf(holder).filter(
		(method) =>
			OTHER_NAMES.has(method.field("name")?.text ?? "") &&
			(method.field("parameters")?.children() ?? []).length === 0,
	);
}

/**
 * What an instance takes that outlives the call taking it, by name: an
 * interval or listener running a function written there, on something the
 * instance holds, its handle dropped or kept in a field; a one-off timer
 * kept in a field; or a handle, socket or process kept in a field. The
 * same function releasing something means it cleans up after itself.
 */
function acquisitions(holder: SyntaxNode): string[] {
	const listens = holder
		.findAll({ rule: { kind: "call_expression" } })
		.filter(
			(call) =>
				LISTENS.has(calleeName(call)) &&
				runsAFunction(call) &&
				!endsWithTheCall(call) &&
				((dropped(call) && !ONE_SHOT.has(calleeName(call))) ||
					keptInAField(call)),
		)
		.map((call) => calleeName(call));
	const opens = holder
		.findAll({ rule: { kind: "call_expression" } })
		.filter((call) => OPENS.has(calleeName(call)) && keptInAField(call))
		.map((call) => calleeName(call));
	const made = holder
		.findAll({ rule: { kind: "new_expression" } })
		.filter(
			(made) =>
				CONSTRUCTS.has(made.field("constructor")?.text ?? "") &&
				keptInAField(made),
		)
		.map((made) => made.field("constructor")?.text ?? "");
	return [...listens, ...opens, ...made];
}

/** The last name of what a call calls: `on` for `source.events.on(...)`. */
function calleeName(call: SyntaxNode): string {
	const callee = call.field("function");
	return (
		(callee?.is("member_expression")
			? callee.field("property")?.text
			: callee?.text) ?? ""
	);
}

/** The function a node is in, up to the method holding it. */
function scopeOf(node: SyntaxNode): SyntaxNode | undefined {
	return node
		.ancestors()
		.find((ancestor) =>
			ancestor.is(
				"method_definition",
				"function_declaration",
				"arrow_function",
				"function_expression",
			),
		);
}

/** Whether a call is handed a function written in place, to run later. */
function runsAFunction(call: SyntaxNode): boolean {
	return (call.field("arguments")?.children() ?? []).some((argument) =>
		argument.is("arrow_function", "function_expression"),
	);
}

/**
 * Whether what a call listens on is the instance itself, a value its
 * function made, or one a method other than the constructor was handed
 * for the call, so the listener lives and dies with that; or whether the
 * call is in a static method, which no instance holds; or whether the same
 * function releases something, cleaning up after itself.
 */
function endsWithTheCall(call: SyntaxNode): boolean {
	const method = call
		.ancestors()
		.find((ancestor) => ancestor.is("method_definition"));
	if (method !== undefined && STATIC.test(method.text)) {
		return true;
	}
	const scope = scopeOf(call);
	if (
		scope
			?.findAll({ rule: { kind: "call_expression" } })
			.some((other) => RELEASES.has(calleeName(other))) === true
	) {
		return true;
	}
	const target = receiver(call);
	return (
		call.field("function")?.field("object")?.is("this") === true ||
		(target !== undefined &&
			(scope
				?.findAll({ rule: { kind: "variable_declarator" } })
				.some((declarator) => declarator.field("name")?.text === target) ===
				true ||
				handedToTheCall(call).has(target)))
	);
}

/** The parameters of every function around a call, short of a constructor's. */
function handedToTheCall(call: SyntaxNode): Set<string> {
	return new Set(
		call
			.ancestors()
			.filter(
				(ancestor) =>
					ancestor.is(
						"method_definition",
						"function_declaration",
						"arrow_function",
						"function_expression",
					) && ancestor.field("name")?.text !== "constructor",
			)
			.flatMap((fn) => [
				...(fn.field("parameters")?.children() ?? []).map(
					(parameter) => parameter.field("pattern")?.text ?? "",
				),
				fn.field("parameter")?.text ?? "",
			]),
	);
}

/** The name at the root of what a method is called on: `child` for `child.stdout.on(...)`. */
function receiver(call: SyntaxNode): string | undefined {
	let target = call.field("function");
	if (!target?.is("member_expression")) {
		return undefined;
	}
	while (target?.is("member_expression", "call_expression")) {
		target = target.is("member_expression")
			? target.field("object")
			: target.field("function");
	}
	return target?.text;
}

/** Whether nothing keeps what a call returns, so nothing can release it. */
function dropped(call: SyntaxNode): boolean {
	return call.parent()?.is("expression_statement") === true;
}

/** Whether what a call returns, awaited or not, goes into a field of the instance. */
function keptInAField(call: SyntaxNode): boolean {
	const value = call.parent()?.is("await_expression") ? call.parent() : call;
	const holder = value?.parent();
	return (
		(holder?.is("assignment_expression", "augmented_assignment_expression") ===
			true &&
			holder.field("left")?.text.startsWith("this.") === true) ||
		holder?.is("public_field_definition") === true
	);
}

/** The types of a method's parameters, as written. */
function parameterTypes(method: SyntaxNode): string[] {
	return (method.field("parameters")?.children() ?? []).map(
		(parameter) => parameter.field("type")?.children()[0]?.text ?? "",
	);
}

/** The type a method says it returns, unless it returns nothing worth keeping. */
function returnType(method: SyntaxNode): string | undefined {
	const type = method.field("return_type")?.children()[0]?.text;
	return type === undefined || type === "void" || type === ""
		? undefined
		: type;
}

/** Whether one of a method's parameters is typed as a function. */
function takesFunction(method: SyntaxNode): boolean {
	return (method.field("parameters")?.children() ?? []).some(
		(parameter) =>
			parameter.field("type")?.children()[0]?.is("function_type") === true,
	);
}

/**
 * Calls that start a timer or add a listener, which run a function handed
 * to them until someone stops them.
 */
const LISTENS = new Set([
	"setInterval",
	"setTimeout",
	"requestAnimationFrame",
	"requestIdleCallback",
	"addEventListener",
	"addListener",
	"on",
	"once",
	"subscribe",
]);

/**
 * Calls that may open a handle, a socket or a process. Plenty of
 * factories share these names, so only one kept in a field is held.
 */
const OPENS = new Set([
	"open",
	"connect",
	"listen",
	"watch",
	"spawn",
	"fork",
	"createReadStream",
	"createWriteStream",
]);

/** Timers that fire once, held only when kept in a field to cancel. */
const ONE_SHOT = new Set([
	"setTimeout",
	"requestAnimationFrame",
	"requestIdleCallback",
]);

/** What `new` makes that stays alive until it is released; held once kept in a field. */
const CONSTRUCTS = new Set([
	"Worker",
	"SharedWorker",
	"WebSocket",
	"EventSource",
	"BroadcastChannel",
	"MessageChannel",
	"MutationObserver",
	"ResizeObserver",
	"IntersectionObserver",
	"PerformanceObserver",
]);

/** Calls that release what the calls above took. */
const RELEASES = new Set([
	"clearInterval",
	"clearTimeout",
	"cancelAnimationFrame",
	"cancelIdleCallback",
	"removeEventListener",
	"removeListener",
	"off",
	"unsubscribe",
	"unobserve",
	"disconnect",
	"close",
	"terminate",
	"kill",
	"dispose",
	"disposeAsync",
]);

/** The other names a release goes by. */
const OTHER_NAMES = new Set([
	"close",
	"destroy",
	"stop",
	"cleanup",
	"cleanUp",
	"teardown",
	"tearDown",
	"unsubscribe",
	"unlisten",
	"unwatch",
	"shutdown",
	"disconnect",
	"release",
	"cancel",
	"abort",
	"free",
	"end",
]);

/** A method taking back what another handed out. */
const CANCELS =
	/^(cancel|clear|unsubscribe|unlisten|unwatch|unregister|unschedule|off|stop|abort|release)/;

/** Types too common to say a method hands out an id by themselves. */
const PRIMITIVES = new Set(["number", "string", "bigint", "symbol"]);

/** A method declared `static`, past any other modifiers. */
const STATIC = /^(?:(?:public|private|protected|async|override)\s+)*static\s/;

/** The names a `Resource` or `AsyncResource` releases by. */
const DISPOSE = new Set(["dispose", "disposeAsync"]);
