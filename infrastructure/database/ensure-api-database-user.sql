-- Ensures the API managed identity has a database user with the reader and
-- writer roles (PBI-DEP-005 D2). Run from the deploy workflow with the sqlcmd
-- variables ApiIdentityName and ApiIdentityClientId. The workflow runs as the
-- SQL Entra admin, so no Graph lookup is needed: SQL Server converts the
-- client id to the SID itself with CAST (... AS uniqueidentifier) to
-- varbinary(16). Idempotent: re-running after the identity was recreated
-- drops the stale user and creates the current one; role adds are skipped
-- when already present.
DECLARE @sid varbinary(16) = CAST(CAST(N'$(ApiIdentityClientId)' AS uniqueidentifier) AS varbinary(16));

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$(ApiIdentityName)' AND sid <> @sid)
BEGIN
    DECLARE @dropSql nvarchar(max) = N'DROP USER ' + QUOTENAME(N'$(ApiIdentityName)') + N';';
    EXEC sp_executesql @dropSql;
END

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$(ApiIdentityName)')
BEGIN
    DECLARE @createSql nvarchar(max) = N'CREATE USER ' + QUOTENAME(N'$(ApiIdentityName)') + N' WITH SID = 0x' + CONVERT(nchar(32), @sid, 2) + N', TYPE = E;';
    EXEC sp_executesql @createSql;
END

IF IS_ROLEMEMBER(N'db_datareader', N'$(ApiIdentityName)') = 0
BEGIN
    DECLARE @readerSql nvarchar(max) = N'ALTER ROLE db_datareader ADD MEMBER ' + QUOTENAME(N'$(ApiIdentityName)') + N';';
    EXEC sp_executesql @readerSql;
END

IF IS_ROLEMEMBER(N'db_datawriter', N'$(ApiIdentityName)') = 0
BEGIN
    DECLARE @writerSql nvarchar(max) = N'ALTER ROLE db_datawriter ADD MEMBER ' + QUOTENAME(N'$(ApiIdentityName)') + N';';
    EXEC sp_executesql @writerSql;
END
