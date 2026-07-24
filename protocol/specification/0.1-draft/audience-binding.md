# Audience and tenant binding

Status: **Experimental security profile**

Signed Install Grant resolutions, Connection Offers, challenges, configured signed Invocations/responses, Approval Challenges, and governed Receipt profiles bind their intended host, organization, workspace, Connection, or runtime audience.

Verification requires the exact configured audience and tenant scope. Missing audience, wildcard high-impact audience, cross-environment use, cross-organization/workspace use, and reuse under another Connection are rejected.
