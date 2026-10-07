import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { occupationPointTermSchema } from '@/campaign-play/services/investigatorApi'
import type { OccupationCatalog, OccupationSkillSlot, SkillCatalog } from '@/campaign-play/types/RuleData'

const slotSchema: z.ZodType<OccupationSkillSlot> = z.lazy(() =>
  z.object({
    kind: z.enum(['skill', 'group', 'any', 'choice']),
    skill: z.string().optional(),
    specialization: z.string().optional(),
    choose: z.number().int().optional(),
    group: z.string().optional(),
    from: z.array(slotSchema).optional(),
  }),
)

const occupationCatalogSchema = z.object({
  era: z.string(),
  skillGroups: z.record(z.string(), z.array(slotSchema)),
  occupations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      creditRatingMin: z.number().int(),
      creditRatingMax: z.number().int(),
      occupationPointFormula: z.object({ terms: z.array(occupationPointTermSchema) }),
      skillSlots: z.array(slotSchema),
    }),
  ),
})

const skillBaseSchema = z.object({
  kind: z.enum(['fixed', 'characteristic']),
  value: z.number().int().optional(),
  characteristic: z.string().optional(),
  divisor: z.number().int().optional(),
})

const skillCatalogSchema = z.object({
  era: z.string(),
  skills: z.array(z.object({ skill: z.string(), specialization: z.string().nullable(), base: skillBaseSchema })),
  closedFamilies: z.array(
    z.object({ skill: z.string(), specializations: z.array(z.object({ specialization: z.string(), base: skillBaseSchema })) }),
  ),
  openFamilies: z.array(z.string()),
  specializationSuggestions: z.record(z.string(), z.array(z.string())),
})

async function getRuleData<T>(accessToken: string, url: string, schema: z.ZodType<T>, what: string): Promise<T> {
  const response = await fetch(url, { headers: authHeaders(accessToken) })
  if (!response.ok) {
    throw new Error(`Failed to load the ${what} (${response.status})`)
  }

  return schema.parse(await response.json())
}

/** GET /api/campaigns/{id}/rules/occupations: the Occupation catalog of the Campaign's Era. */
export function getOccupationCatalog(accessToken: string, campaignId: string): Promise<OccupationCatalog> {
  return getRuleData(accessToken, `/api/campaigns/${campaignId}/rules/occupations`, occupationCatalogSchema, 'occupations')
}

/** GET /api/campaigns/{id}/rules/skills: the skills, specialized skills, and suggestions of the Campaign's Era. */
export function getSkillCatalog(accessToken: string, campaignId: string): Promise<SkillCatalog> {
  return getRuleData(accessToken, `/api/campaigns/${campaignId}/rules/skills`, skillCatalogSchema, 'skills')
}
