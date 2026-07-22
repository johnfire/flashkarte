# Data-subject request runbook

Verify the requester through their authenticated account or a reply from the
registered email address. Record the request date, identity check, scope,
owner, and outcome in a restricted register. Respond within one month unless a
documented lawful extension applies.

For access or portability, use the account export endpoint and provide the
result only through the authenticated session. For erasure, use the account
deletion flow, run the GitHub `Purge expired app bug reports` workflow with the
linked issue number, and record that backup copies expire within three months.
Audit history is retained for twelve months with no unnecessary PII.

