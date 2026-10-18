import type { Meta, StoryObj } from '@storybook/react-vite'

import { stateFromHumanNpc, type SectionFieldsProps } from '@/scenario-preparation/services/humanNpcForm'
import { thugHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcCharacteristicsFields } from './npc-characteristics-fields'

const noError: SectionFieldsProps['errorOf'] = () => undefined

const meta = {
  title: 'ScenarioPreparation/NpcCharacteristicsFields',
  component: NpcCharacteristicsFields,
  args: { state: stateFromHumanNpc(thugHumanNpc), dispatch: () => undefined, errorOf: noError },
} satisfies Meta<typeof NpcCharacteristicsFields>

export default meta
type Story = StoryObj<typeof meta>

export const Filled: Story = {}
export const WithServerError: Story = { args: { errorOf: (path) => (path === 'characteristics.STR' ? 'Enter STR from 0 to 100.' : undefined) } }
export const Narrow320: Story = { decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>] }
