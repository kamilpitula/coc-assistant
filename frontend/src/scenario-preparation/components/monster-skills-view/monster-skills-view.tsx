import { StatTable } from '@/scenario-preparation/components/stat-table/stat-table'
import type { MonsterSkill } from '@/scenario-preparation/types/MythosCreature'

interface MonsterSkillsViewProps {
  skills: MonsterSkill[]
}

/** The Skills section of a Monster Profile in view mode, in the entered order (specs/scenario-preparation/ux.md section 25.5; SP-UX-48). */
export function MonsterSkillsView({ skills }: MonsterSkillsViewProps) {
  if (skills.length === 0) {
    return <p className="text-sm text-muted-foreground">None recorded.</p>
  }

  return (
    <StatTable
      label="Skills"
      columns={['Skill', 'Value', 'Investigator difficulty']}
      rows={skills.map((skill) => [skill.name ?? '', String(skill.value ?? ''), skill.difficulty])}
    />
  )
}
