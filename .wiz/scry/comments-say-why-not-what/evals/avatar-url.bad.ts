const DEFAULT_AVATAR = "/static/avatar-placeholder.png";

export function avatarUrl(user: { avatarPath?: string }, size = 64): string {
	// if the user has no avatar, return the default avatar
	if (!user.avatarPath) {
		return DEFAULT_AVATAR;
	}
	return `https://cdn.example.com/${user.avatarPath}?w=${size}&h=${size}`;
}
