using System.Net;
using System.Text.Json;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace Apopto.Backend;

public sealed class Function
{
    public APIGatewayHttpApiV2ProxyResponse Health(APIGatewayHttpApiV2ProxyRequest request, ILambdaContext context)
    {
        var environment =
            Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Unknown";

        var responseBody = JsonSerializer.Serialize(new
        {
            status = "ok",
            environment,
            requestId = context.AwsRequestId,
        });

        return new APIGatewayHttpApiV2ProxyResponse
        {
            StatusCode = (int)HttpStatusCode.OK,
            Headers = new Dictionary<string, string>
            {
                ["content-type"] = "application/json",
                ["cache-control"] = "no-store",
            },
            Body = responseBody,
        };
    }
}
