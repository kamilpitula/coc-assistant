import type { Meta, StoryObj } from '@storybook/react-vite'

import type { SkillCatalog } from '@/campaign-play/types/RuleData'
import { stateFromHumanNpc, type SectionFieldsProps } from '@/scenario-preparation/services/humanNpcForm'
import { gangsterHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcSkillRows } from './npc-skill-rows'

const catalog = {
  era: '1920s',
  skills: [{ skill: 'Spot Hidden', specialization: null, base: { kind: 'fixed', value: 25 } }],
  closedFamilies: [
    { skill: 'Fighting', specializations: [{ specialization: 'Brawl', base: { kind: 'fixed', value: 25 } }] },
    { skill: 'Firearms', specializations: [{ specialization: 'Handgun', base: { kind: 'fixed', value: 20 } }] },
  ],
  openFamilies: [],
  specializationSuggestions: {},
} as SkillCatalog

const manySkills = Array.from({ length: 100 }, (_, index) => ({
  name: `Skill ${index + 1}`,
  specialization: null,
  value: 10,
  difficulty: 'Regular' as const,
}))

const noError: SectionFieldsProps['errorOf'] = () => undefined

const meta = {
  title: 'ScenarioPreparation/NpcSkillRows',
  component: NpcSkillRows,
  args: {
    state: stateFromHumanNpc(gangsterHumanNpc),
    dispatch: () => undefined,
    errorOf: noError,
    skillCatalog: catalog,
    catalogFailed: false,
    onRetryCatalog: () => undefined,
  },
} satisfies Meta<typeof NpcSkillRows>

export default meta
type Story = StoryObj<typeof meta>

export const WithRows: Story = {}
export const NoRows: Story = { args: { state: stateFromHumanNpc({ ...gangsterHumanNpc, skills: [] }) } }
export const OneHundredRows: Story = { args: { state: stateFromHumanNpc({ ...gangsterHumanNpc, skills: manySkills }) } }
export const SkillListFailure: Story = { args: { skillCatalog: undefined, catalogFailed: true } }
export const WithServerError: Story = {
  args: { errorOf: (path) => (path === 'skills[0].value' ? 'Enter a value from 0 to 100.' : undefined) },
}
export const Narrow320: Story = { decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>] }
