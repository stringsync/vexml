import { afterEach, describe, expect, it } from "bun:test";
import { ChatRoom } from "./chat-room";

const rooms: ChatRoom[] = [];
let nextId = 1;

function openRoom(): ChatRoom {
	const room = new ChatRoom(`room-${nextId++}`);
	rooms.push(room);
	return room;
}

describe("ChatRoom", () => {
	afterEach(() => {
		for (const room of rooms) room.dispose();
	});

	it("delivers a message to every member", () => {
		const room = openRoom();
		room.join("alice");
		room.join("bob");
		room.post("alice", "hi");
		expect(room.inbox("bob")).toEqual(["hi"]);
	});

	it("gives each room its own id", () => {
		expect(openRoom().id).not.toBe(openRoom().id);
	});
});
