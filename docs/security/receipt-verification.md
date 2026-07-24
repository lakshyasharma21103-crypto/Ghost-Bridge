# Receipt verification

A governed signed Receipt uses a Passport-authorized Agent execution key and binds Agent/Passport/key, Invocation/Task/capability, tenant, outcome/times/attempt, approval and Data Contract references, safe digests, revocation state, audience, and trust profile.

Historical status is explicit. Retirement can remain valid for historical evidence. Revocation invalidates according to policy. An uncertain compromise window yields `indeterminate_due_to_compromise`; the Receipt is preserved rather than silently deleted.
