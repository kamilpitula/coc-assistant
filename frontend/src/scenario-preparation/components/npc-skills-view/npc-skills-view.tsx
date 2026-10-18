import { StatTable } from '@/scenario-preparation/components/stat-table/stat-table'
import { describeSkill } from '@/scenario-preparation/services/skillRowLabels'
import type { HumanNpcSkill } from '@/scenario-preparation/types/HumanNpc'

interface NpcSkillsViewProps {
  skills: HumanNpcSkill[]
}

/** The Skills section in view mode, in the entered order (specs/scenario-preparation/ux.md section 25.4; SP-UX-42). */
export function NpcSkillsView({ skills }: NpcSkillsViewProps) {
  if (skills.length === 0) {
    return <p className="text-sm text-muted-foreground">None recorded.</p>
  }

  return (
    <StatTable
      label="Skills"
      columns={['Skill', 'Value', 'Investigator difficulty']}
      rows={skills.map((skill) => [describeSkill(skill), String(skill.value ?? ''), skill.difficulty])}
    />
  )
}
