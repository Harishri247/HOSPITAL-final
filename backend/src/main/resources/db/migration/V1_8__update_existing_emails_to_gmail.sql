-- Migration V1_8: Update all existing user email addresses to end with @gmail.com

UPDATE users u
SET email = LOWER(
    CASE 
        WHEN (SELECT COUNT(*) FROM users u2 WHERE SPLIT_PART(u2.email, '@', 1) = SPLIT_PART(u.email, '@', 1)) > 1
        THEN SPLIT_PART(u.email, '@', 1) || '_' || u.id || '@gmail.com'
        ELSE 
            CASE 
                WHEN u.email LIKE '%@%' THEN SPLIT_PART(u.email, '@', 1) || '@gmail.com'
                ELSE u.username || '@gmail.com'
            END
    END
)
WHERE email IS NULL OR email NOT ILIKE '%@gmail.com';
