---
name: comments-say-why-not-what
description: A comment explains why the code is as it is, never what it plainly does.
files: "**/*.ts"
level: error
complexity: medium
recommended: true
version: 0.0.13
---
# Comments say why, not what

Comments are sparse. A comment that describes what the code directly under it
does is unacceptable: the code already says that, and the comment will rot.
Comment only to explain why: why an unexpected code path exists, why the
obvious approach was not taken, why a constraint holds.

## Good

```ts
// retry once: the registry drops the first request after a cold start
const response = (await fetch(url)) ?? (await fetch(url));
```

```ts
if (entry.startsWith(".")) {
	continue; // dotfiles are configuration, not content to analyze
}
```

## Bad

```ts
// increment the counter
counter++;
```

```ts
// loop over the users and collect their names
const names = users.map((u) => u.name);
```
