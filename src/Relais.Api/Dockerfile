FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY Relais.Domain/*.csproj Relais.Domain/
COPY Relais.Infrastructure/*.csproj Relais.Infrastructure/
COPY Relais.Api/*.csproj Relais.Api/
RUN dotnet restore Relais.Api/Relais.Api.csproj

COPY Relais.Domain/ Relais.Domain/
COPY Relais.Infrastructure/ Relais.Infrastructure/
COPY Relais.Api/ Relais.Api/
RUN dotnet publish Relais.Api/Relais.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Relais.Api.dll"]
