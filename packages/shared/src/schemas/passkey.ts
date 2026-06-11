import * as v from 'valibot'
import { EmailSchema } from './user.ts'

export const StartBodySchema = v.object({
  email: EmailSchema,
  force: v.optional(v.picklist(['otp'])),
  redirect: v.optional(v.string()),
})
export type StartBody = v.InferOutput<typeof StartBodySchema>

export const OtpVerifyBodySchema = v.object({
  email: EmailSchema,
  code: v.pipe(v.string(), v.regex(/^\d{6}$/)),
})
export type OtpVerifyBody = v.InferOutput<typeof OtpVerifyBodySchema>

/**
 * Passkey authentication assertion — shape comes from SimpleWebAuthn library;
 * we keep it as `record(unknown)` at the boundary and let the lib validate.
 */
export const PasskeyAuthVerifyBodySchema = v.object({
  email: EmailSchema,
  assertion: v.record(v.string(), v.unknown()),
})
export type PasskeyAuthVerifyBody = v.InferOutput<typeof PasskeyAuthVerifyBodySchema>

export const PasskeyRegisterVerifyBodySchema = v.object({
  challengeId: v.pipe(v.string(), v.minLength(1)),
  attestation: v.record(v.string(), v.unknown()),
  label: v.optional(v.pipe(v.string(), v.maxLength(80))),
})
export type PasskeyRegisterVerifyBody = v.InferOutput<typeof PasskeyRegisterVerifyBodySchema>
