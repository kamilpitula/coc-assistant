import type { Meta, StoryObj } from '@storybook/react-vite'

import { stateFromHumanNpc, type SectionFieldsProps } from '@/scenario-preparation/services/humanNpcForm'
import { gangsterHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcSpellRows } from './npc-spell-rows'

const noError: SectionFieldsProps['errorOf'] = () => undefined

const meta = {
  title: 'ScenarioPreparation/NpcSpellRows',
  component: NpcSpellRows,
  args: { state: stateFromHumanNpc(gangsterHumanNpc), dispatch: () => undefined, errorOf: noError },
} satisfies Meta<typeof NpcSpellRows>

export default meta
type Story = StoryObj<typeof meta>

export const WithRow: Story = {}
export const NoRows: Story = { args: { state: stateFromHumanNpc({ ...gangsterHumanNpc, spells: [] }) } }
export const WithServerError: Story = { args: { errorOf: (path) => (path === 'spells[0].name' ? "Enter the spell's name." : undefined) } }
export const Narrow320: Story = { decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>] }
