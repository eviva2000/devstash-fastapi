\set ON_ERROR_STOP on

CREATE ROLE devstash
    WITH LOGIN
    PASSWORD 'devstash-local-only'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE;

CREATE DATABASE devstash OWNER devstash;
