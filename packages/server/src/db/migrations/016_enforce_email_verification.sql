-- AUTH-006: existing accounts predate enforcement and were allowed full use
-- without verification. Grandfather them once so deployment does not cause a
-- surprise lockout; accounts created after this migration must verify normally.
UPDATE users
SET email_verified_at = now(), updated_at = now()
WHERE email_verified_at IS NULL;
