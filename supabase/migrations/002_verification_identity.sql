alter table verifications
    alter column id drop default;

alter table verifications
    alter column id type text
    using id::text;

alter table verifications
    alter column id set not null;
