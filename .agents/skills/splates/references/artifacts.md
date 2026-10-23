# Artifact space

Archiving a conversation deletes the bytes of its removed artifacts and
earlier versions, keeping what its panel shows; each leaves a placeholder
saying why it went.

One file may be 50 MB, one conversation's artifacts 250 MB, and the project's
2 GB, counting every version whose bytes are kept and, toward the last two,
the files attached from conversations (`artifactFileCapacity`,
`artifactConversationCapacity` and `artifactProjectCapacity` in
`splates.config.ts`). Past the project's, `splates server` evicts the oldest bytes
first: removed and earlier versions of any conversation, then what archived
conversations show, then what live ones do. Past the file's or the
conversation's, or the project's when even eviction would not make room,
`add` stops on `too_large`, keeping nothing of that file: trim a recording
rather than ask for more room.
