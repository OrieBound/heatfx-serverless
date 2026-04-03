<#
.SYNOPSIS
  Package and deploy the HeatFX CloudFormation parent stack.

.DESCRIPTION
  1. Creates the packaging S3 bucket if it doesn't exist.
  2. Runs `aws cloudformation package` to upload nested templates + Lambda zip.
  3. Runs `aws cloudformation deploy` to create/update the parent stack.

.PARAMETER Env
  Resource name suffix. Default: dev

.PARAMETER PackagingBucket
  S3 bucket for CloudFormation artifacts. Default: heatfx-cfn-artifacts

.PARAMETER CognitoDomainPrefix
  Globally unique Hosted UI domain prefix (e.g. heatfx-yourname-dev). REQUIRED.

.PARAMETER Region
  AWS region. Default: us-east-1

.PARAMETER Profile
  AWS CLI named profile. Default: (uses current shell credentials)

.PARAMETER AppCallbackUrls
  OAuth callback URL(s). Default: http://localhost:3000/auth/callback

.PARAMETER AppLogoutUrls
  Sign-out URL(s). Default: http://localhost:3000/

.PARAMETER CorsAllowOrigin
  API CORS Allow-Origin header value. Default: *

.EXAMPLE
  .\scripts\deploy-aws.ps1 -CognitoDomainPrefix heatfx-yourname-dev
#>

[CmdletBinding()]
param(
    [string]$Env              = ($env:ENV               ?? 'dev'),
    [string]$PackagingBucket  = ($env:PACKAGING_BUCKET  ?? 'heatfx-cfn-artifacts'),
    [string]$CognitoDomainPrefix = ($env:COGNITO_DOMAIN_PREFIX ?? ''),
    [string]$Region           = ($env:AWS_REGION        ?? 'us-east-1'),
    [string]$Profile          = ($env:AWS_PROFILE       ?? ''),
    [string]$AppCallbackUrls  = ($env:APP_CALLBACK_URLS ?? 'http://localhost:3000/auth/callback'),
    [string]$AppLogoutUrls    = ($env:APP_LOGOUT_URLS   ?? 'http://localhost:3000/'),
    [string]$CorsAllowOrigin  = ($env:CORS_ALLOW_ORIGIN ?? '*')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── helpers ──────────────────────────────────────────────────────────────────

function Write-Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Fail([string]$msg) { Write-Host "    ERR $msg" -ForegroundColor Red; exit 1 }

# Build a base aws cli args array so --profile is optional
$AwsBase = @('--region', $Region)
if ($Profile) { $AwsBase += @('--profile', $Profile) }

# ── validate ─────────────────────────────────────────────────────────────────

if (-not $CognitoDomainPrefix) {
    Write-Fail "CognitoDomainPrefix is required. Pass -CognitoDomainPrefix or set `$env:COGNITO_DOMAIN_PREFIX."
}

Write-Step "Config"
Write-Host "  Environment       : $Env"
Write-Host "  Region            : $Region"
Write-Host "  Profile           : $(if ($Profile) { $Profile } else { '(default)' })"
Write-Host "  PackagingBucket   : $PackagingBucket"
Write-Host "  CognitoDomainPrefix: $CognitoDomainPrefix"
Write-Host "  AppCallbackUrls   : $AppCallbackUrls"
Write-Host "  AppLogoutUrls     : $AppLogoutUrls"
Write-Host "  CorsAllowOrigin   : $CorsAllowOrigin"

# ── paths ────────────────────────────────────────────────────────────────────

$RepoRoot      = Split-Path $PSScriptRoot -Parent
$TemplateDir   = Join-Path $RepoRoot 'infra\cloudformation'
$ParentTemplate= Join-Path $TemplateDir 'parent.yaml'
$PackagedDir   = Join-Path $TemplateDir '.packaged'
$PackagedTpl   = Join-Path $PackagedDir 'parent.yaml'
$StackName     = "heatfx-$Env"

if (-not (Test-Path $ParentTemplate)) {
    Write-Fail "Template not found: $ParentTemplate"
}

New-Item -ItemType Directory -Force -Path $PackagedDir | Out-Null

# ── 1. ensure packaging bucket ────────────────────────────────────────────────

Write-Step "Ensuring packaging bucket: $PackagingBucket"

$bucketExists = $false
try {
    aws s3api head-bucket --bucket $PackagingBucket @AwsBase 2>$null
    $bucketExists = ($LASTEXITCODE -eq 0)
} catch { }

if (-not $bucketExists) {
    Write-Host "  Creating bucket $PackagingBucket in $Region ..."
    if ($Region -eq 'us-east-1') {
        aws s3api create-bucket --bucket $PackagingBucket @AwsBase | Out-Null
    } else {
        aws s3api create-bucket --bucket $PackagingBucket `
            --create-bucket-configuration LocationConstraint=$Region `
            @AwsBase | Out-Null
    }
    if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to create packaging bucket." }
    Write-Ok "Bucket created."
} else {
    Write-Ok "Bucket already exists."
}

# ── 2. package ────────────────────────────────────────────────────────────────

Write-Step "Packaging templates + Lambda (aws cloudformation package)"

aws cloudformation package `
    --template-file $ParentTemplate `
    --s3-bucket $PackagingBucket `
    --output-template-file $PackagedTpl `
    @AwsBase

if ($LASTEXITCODE -ne 0) { Write-Fail "cloudformation package failed." }
Write-Ok "Packaged -> $PackagedTpl"

# ── 3. deploy ─────────────────────────────────────────────────────────────────

Write-Step "Deploying stack: $StackName"

aws cloudformation deploy `
    --stack-name $StackName `
    --template-file $PackagedTpl `
    --parameter-overrides `
        "Environment=$Env" `
        "CognitoDomainPrefix=$CognitoDomainPrefix" `
        "AppCallbackUrls=$AppCallbackUrls" `
        "AppLogoutUrls=$AppLogoutUrls" `
        "CorsAllowOrigin=$CorsAllowOrigin" `
    --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND `
    @AwsBase

if ($LASTEXITCODE -ne 0) { Write-Fail "cloudformation deploy failed." }
Write-Ok "Stack $StackName deployed."

# ── 4. print outputs ──────────────────────────────────────────────────────────

Write-Step "Stack outputs"

aws cloudformation describe-stacks `
    --stack-name $StackName `
    --query 'Stacks[0].Outputs' `
    --output table `
    @AwsBase
