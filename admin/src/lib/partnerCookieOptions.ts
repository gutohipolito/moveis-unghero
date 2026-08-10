/** Opções de cookie do portal do parceiro. */
export function partnerCookieOptions(maxAge: number) {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    /**
     * Portal público em iframe (moveisunghero.com.br) → precisa de None.
     * Em dev (http) Chrome rejeita None sem Secure; usa Lax.
     */
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    maxAge,
  };
}
