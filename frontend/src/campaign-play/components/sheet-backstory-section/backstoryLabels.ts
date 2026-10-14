import type { BackstoryKey } from '@/campaign-play/types/CharacterSheet'

/** Labels for My Story and the Background entries, in sentence case (docs/game-rules section 12). */
export const backstoryLabels: Record<BackstoryKey, string> = {
  myStory: 'My story',
  personalDescription: 'Personal description',
  traits: 'Traits',
  ideologyAndBeliefs: 'Ideology and beliefs',
  injuriesAndScars: 'Injuries and scars',
  significantPeople: 'Significant people',
  phobiasAndManias: 'Phobias and manias',
  meaningfulLocations: 'Meaningful locations',
  arcaneTomesAndSpells: 'Arcane tomes and spells',
  treasuredPossessions: 'Treasured possessions',
  encountersWithStrangeEntities: 'Encounters with strange entities',
}
