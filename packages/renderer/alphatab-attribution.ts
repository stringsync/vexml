import ts from 'typescript';

/** Use instrument() on an alphaTab script before injecting it to capture glyph ink
 * separately within each beat. */
export class AlphatabAttribution {
	private constructor() {}
	static instrument(source: string): string {
		const tree = ts.createSourceFile(
			'alphatab.js',
			source,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.JS,
		);
		const edits: Array<{ at: number; text: string }> = [];
		const visit = (node: ts.Node): void => {
			if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
				const name =
					node.name?.text ??
					(ts.isVariableDeclaration(node.parent)
						? node.parent.name.getText(tree)
						: 'glyph');
				for (const method of node.members) {
					if (
						!ts.isMethodDeclaration(method) ||
						method.name.getText(tree) !== 'paint' ||
						!method.body ||
						!method.parameters.some((p) => p.name.getText(tree) === 'canvas')
					) {
						continue;
					}
					edits.push({
						at: method.body.getStart(tree) + 1,
						text: `\ncanvas.beginGroup(${JSON.stringify(`ink-${name}`)}${name === 'MusicFontGlyph' ? " + '-' + this.symbol" : ''}); try {\n`,
					});
					edits.push({
						at: method.body.end - 1,
						text: '\n} finally { canvas.endGroup(); }\n',
					});
				}
			}
			ts.forEachChild(node, visit);
		};
		visit(tree);
		for (const edit of edits.sort((a, b) => b.at - a.at)) {
			source = source.slice(0, edit.at) + edit.text + source.slice(edit.at);
		}
		return source;
	}
}
