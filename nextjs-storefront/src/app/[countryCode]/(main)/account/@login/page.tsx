import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "Conectare",
  description: "Conectează-te la contul tău Qubitpage.",
}

export default function Login() {
  return <LoginTemplate />
}
