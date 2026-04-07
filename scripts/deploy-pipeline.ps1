# Deploy heatfx-pipeline stack in the CURRENT AWS account/region.
param(
    [string]$Region = ($env:AWS_REGION ?? 'us-east-1'),
    [string]$Profile = ($env:AWS_PROFILE ?? '')
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Params = Join-Path $Root 'infra\cloudformation\pipeline\pipeline-params.json'
$Template = Join-Path $Root 'infra\cloudformation\pipeline\pipeline.yaml'

$Aws = @('--region', $Region)
if ($Profile) { $Aws += @('--profile', $Profile) }

$Account = aws sts get-caller-identity --query Account --output text @Aws
Write-Host "Account: $Account"
Write-Host "Region:  $Region"

# Optional: set HEATFX_EXPECT_PIPELINE_ACCOUNT to abort if caller account differs.
if ($env:HEATFX_EXPECT_PIPELINE_ACCOUNT -and -not $env:HEATFX_SKIP_PIPELINE_ACCOUNT_CHECK -and $Account -ne $env:HEATFX_EXPECT_PIPELINE_ACCOUNT) {
    throw "Caller account ($Account) does not match HEATFX_EXPECT_PIPELINE_ACCOUNT ($($env:HEATFX_EXPECT_PIPELINE_ACCOUNT)). Fix profile or env, or set HEATFX_SKIP_PIPELINE_ACCOUNT_CHECK=1."
}

$Example = Join-Path $Root 'infra\cloudformation\pipeline\pipeline-params.example.json'
if (-not (Test-Path $Params)) {
    if (-not (Test-Path $Example)) { throw "Missing $Params and $Example" }
    Copy-Item $Example $Params
    Write-Host "Created pipeline-params.json from example — edit if needed."
}

# Two slashes after "file:" — file:///D:/... makes the CLI open /D:/... and fails on Windows.
$ParamsResolved = (Resolve-Path $Params).Path -replace '\\', '/'
$ParamsUri = "file://$ParamsResolved"

aws cloudformation deploy `
    --stack-name heatfx-pipeline `
    --template-file $Template `
    --capabilities CAPABILITY_NAMED_IAM CAPABILITY_IAM `
    --parameter-overrides $ParamsUri `
    @Aws

aws cloudformation describe-stacks `
    --stack-name heatfx-pipeline `
    --query 'Stacks[0].Outputs' `
    --output table `
    @Aws
