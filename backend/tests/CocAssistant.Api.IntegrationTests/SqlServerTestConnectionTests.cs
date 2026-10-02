namespace CocAssistant.Api.IntegrationTests;

public class SqlServerTestConnectionTests
{
    private const string DatabaseName = "CocAssistantSampleTests";
    private const string ConfiguredServer = "Server=localhost,1433;User Id=sa;Password=Sample_Passw0rd;TrustServerCertificate=True";

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Given_no_configured_server_When_building_Then_it_targets_localdb_with_integrated_security(string? configuredServer)
    {
        var builder = new SqlConnectionStringBuilder(SqlServerTestConnection.Build(configuredServer, DatabaseName));

        Assert.Equal(@"(localdb)\mssqllocaldb", builder.DataSource);
        Assert.True(builder.IntegratedSecurity);
        Assert.Equal(DatabaseName, builder.InitialCatalog);
        Assert.True(builder.MultipleActiveResultSets);
    }

    [Fact]
    public void Given_a_configured_server_When_building_Then_it_keeps_the_server_settings_and_sets_the_database()
    {
        var builder = new SqlConnectionStringBuilder(SqlServerTestConnection.Build(ConfiguredServer, DatabaseName));

        Assert.Equal("localhost,1433", builder.DataSource);
        Assert.Equal("sa", builder.UserID);
        Assert.Equal("Sample_Passw0rd", builder.Password);
        Assert.True(builder.TrustServerCertificate);
        Assert.False(builder.IntegratedSecurity);
        Assert.Equal(DatabaseName, builder.InitialCatalog);
        Assert.True(builder.MultipleActiveResultSets);
    }

    [Fact]
    public void Given_a_configured_server_with_a_database_When_building_Then_the_caller_database_wins()
    {
        var builder = new SqlConnectionStringBuilder(
            SqlServerTestConnection.Build(ConfiguredServer + ";Database=OtherDatabase", DatabaseName));

        Assert.Equal(DatabaseName, builder.InitialCatalog);
    }
}
