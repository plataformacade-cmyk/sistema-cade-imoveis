<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:delivery-rules -->
# Delivery rules

When a requested task is implemented and validated, do not leave it only as local work. Unless the user explicitly asks otherwise, finish the delivery path:

- run the relevant checks;
- commit the completed scope;
- push it to GitHub;
- apply required Supabase migrations to the target project;
- deploy to production on Vercel;
- run a post-deploy smoke check;
- update the related Linear task status with evidence.

Only stop before production when a required credential, permission, or external service access is missing. In that case, report the exact blocker and the safest next action.
<!-- END:delivery-rules -->
