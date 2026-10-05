import type { Database } from "./database.ts";

export interface User {
	id: string;
	email: string;
	name: string;
}

export async function findUser(db: Database, id: string): Promise<User | undefined> {
	return db.queryOne<User>("select * from users where id = ?", [id]);
}

export async function saveUser(db: Database, user: User): Promise<void> {
	await db.execute(
		"insert into users (id, email, name) values (?, ?, ?) on conflict (id) do update set email = excluded.email, name = excluded.name",
		[user.id, user.email, user.name],
	);
}

export async function deleteUser(db: Database, id: string): Promise<void> {
	await db.execute("delete from users where id = ?", [id]);
}
