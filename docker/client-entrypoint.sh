#!/bin/sh
set -eu
: "${API_UPSTREAM:=http://app:4000}"
# Trailing slash on upstream strips /api from the proxied path — strip it.
API_UPSTREAM="${API_UPSTREAM%/}"
export API_UPSTREAM
envsubst '${API_UPSTREAM}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf