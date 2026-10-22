/** Headers for an authenticated request to the CoC Assistant API that sets its own content type, such as a multipart upload. */
export function bearerHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` }
}

/** Headers for an authenticated JSON request to the CoC Assistant API. */
export function authHeaders(accessToken: string): HeadersInit {
  return {
    ...bearerHeaders(accessToken),
    'Content-Type': 'application/json',
  }
}
