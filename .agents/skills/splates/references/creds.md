# Creds

When your work needs a secret only the user can get, such as an API token,
request it rather than asking in chat or reading an environment variable,
naming it as its environment variable would be. Say in `--purpose`, in a
sentence, why your work needs it and what it will be used for, so the user
knows what they are handing over before they go to get it; then give
instructions for getting it in markdown: where to go, what to pick, what to
paste.

```sh
splates creds request CLOUDFLARE_TUNNEL_TOKEN --device --purpose 'To add the DNS record that routes `dev.example.com` to the tunnel, through the Cloudflare API.' --instructions '1. Open [API Tokens](https://dash.cloudflare.com/profile/api-tokens), then **Create Token**.
2. Add Zone · DNS · Edit, and pick your zone.
3. Create it and paste it here.'
```

`--device` keeps it for every project on this machine, for the user's own
account; leave it off for a cred of this project's alone. When the store
already keeps it, `request` asks nothing; `--replace` asks again when the
kept one does not work. Leave `--provider` off: the user picks who keeps it on the Creds page. The `splates server` page shows a "Requested" line in
the conversation that opens the cred on its Creds page, with what it is for,
your instructions and a field to paste it in; say nothing more of the
request. The page's Creds item gets a yellow dot while any request is open, and its
Creds page lists them too, with every cred kept, so a user outside the
conversation finds it there. `splates creds wait <NAME>` until the user saves
it, again on `timeout`, doing meanwhile what does not need it; it ends on
`dismissed` when they turn it down, so carry on without it or ask why.

You never see the value: it goes into the system's store (the macOS
Keychain, Windows Credential Manager, a Linux secret service), and code
reads it in-process through `webappwiz/creds`, never through the
environment, argv or a file. `splates creds list` names what is requested and
kept.
