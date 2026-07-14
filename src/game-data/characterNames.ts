export type CharacterNameGender = 'masculine' | 'feminine'

export const characterNamesByRegion = {
  masculine: {
    ardan: ['Arel', 'Belan', 'Cador', 'Darven', 'Elian', 'Faren', 'Garen', 'Lior', 'Mavian', 'Orlen'],
    ironMountains: ['Branek', 'Dren', 'Korven', 'Targon', 'Varek', 'Brodan', 'Keld', 'Torik', 'Gromar', 'Ruden'],
    brokenCoast: ['Aimar', 'Boren', 'Casmar', 'Doren', 'Edrik', 'Faron', 'Marven', 'Neran', 'Odran', 'Ravel'],
    nhalor: ['Alven', 'Eiran', 'Ilan', 'Norel', 'Orian', 'Selven', 'Talen', 'Veren', 'Yarin', 'Luren'],
    varg: ['Aldren', 'Corvak', 'Drevan', 'Morven', 'Nargan', 'Orvak', 'Ruvan', 'Sornar', 'Varos', 'Zarek'],
    ashSea: ['Ardo', 'Brask', 'Cern', 'Davor', 'Erkan', 'Falken', 'Hadrik', 'Jorven', 'Karsen', 'Malk'],
    saltDesert: ['Adir', 'Bahir', 'Calem', 'Damar', 'Iram', 'Jalen', 'Kadir', 'Naim', 'Ramir', 'Samor'],
    northernSteppes: ['Aksel', 'Bjar', 'Eirik', 'Halvor', 'Ivar', 'Kjell', 'Noren', 'Sten', 'Toren', 'Vidar'],
    dawnPeninsula: ['Aurel', 'Caelen', 'Eron', 'Levan', 'Mireo', 'Odel', 'Seren', 'Tiber', 'Valen', 'Zorian'],
    islands: ['Aro', 'Bero', 'Ciro', 'Daro', 'Enor', 'Faro', 'Miro', 'Nilo', 'Rian', 'Tavo'],
  },
  feminine: {
    ardan: ['Aelia', 'Belena', 'Cária', 'Dalia', 'Elira', 'Fiana', 'Galia', 'Liora', 'Mavena', 'Orlina'],
    ironMountains: ['Brana', 'Drena', 'Kora', 'Targa', 'Varka', 'Broda', 'Kelda', 'Tora', 'Grima', 'Runa'],
    brokenCoast: ['Aima', 'Borena', 'Casma', 'Dorena', 'Edria', 'Farena', 'Maris', 'Neria', 'Odra', 'Ravela'],
    nhalor: ['Alvena', 'Eira', 'Ilana', 'Norela', 'Oriana', 'Selva', 'Talena', 'Verena', 'Yara', 'Nalia'],
    varg: ['Aldra', 'Corva', 'Drevena', 'Morva', 'Narga', 'Orva', 'Ruvena', 'Sorena', 'Varsa', 'Zarela'],
    ashSea: ['Arda', 'Braska', 'Cerna', 'Davra', 'Erka', 'Falka', 'Hadra', 'Jora', 'Karsa', 'Malka'],
    saltDesert: ['Adira', 'Bahira', 'Calia', 'Damara', 'Irana', 'Jalena', 'Kadira', 'Naima', 'Ramira', 'Samara'],
    northernSteppes: ['Aksa', 'Bjara', 'Eirika', 'Halva', 'Ivara', 'Kella', 'Norena', 'Stena', 'Torena', 'Vida'],
    dawnPeninsula: ['Aurela', 'Caela', 'Erona', 'Levana', 'Mirela', 'Odela', 'Serena', 'Tibera', 'Valena', 'Zoria'],
    islands: ['Ara', 'Bera', 'Cira', 'Dara', 'Enora', 'Mira', 'Nila', 'Riana', 'Tavia', 'Vela'],
  },
} as const

function flattenNames(gender: CharacterNameGender) {
  return Object.values(characterNamesByRegion[gender]).flat()
}

export const characterNames = {
  masculine: flattenNames('masculine'),
  feminine: flattenNames('feminine'),
} as const

export function getCharacterNameGender(presentation: string): CharacterNameGender | null {
  const normalized = presentation.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  if (/\bmasculino\b/.test(normalized)) return 'masculine'
  if (/\bfeminino\b/.test(normalized)) return 'feminine'
  return null
}

function getRandomIndex(length: number) {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1)
    globalThis.crypto.getRandomValues(value)
    return value[0] % length
  }
  return Math.floor(Math.random() * length)
}

export function getRandomCharacterName(gender: CharacterNameGender, previousName = '') {
  const names = characterNames[gender]
  const available = names.length > 1 ? names.filter((name) => name !== previousName.trim()) : names
  return available[getRandomIndex(available.length)]
}
