/**
 * Harry Potter Universe Character Names
 * Used for generating random opponent names in game preparation scenarios
 */

export const HARRY_POTTER_NAMES = [
  // Main Characters
  'Harry Potter',
  'Hermione Granger',
  'Ron Weasley',
  'Albus Dumbledore',
  'Severus Snape',
  'Minerva McGonagall',
  'Rubeus Hagrid',
  'Sirius Black',
  'Remus Lupin',
  'Draco Malfoy',

  // Hogwarts Students
  'Neville Longbottom',
  'Luna Lovegood',
  'Ginny Weasley',
  'Fred Weasley',
  'George Weasley',
  'Cedric Diggory',
  'Cho Chang',
  'Dean Thomas',
  'Seamus Finnigan',
  'Lavender Brown',
  'Parvati Patil',
  'Padma Patil',
  'Hannah Abbott',
  'Susan Bones',
  'Ernie Macmillan',
  'Justin Finch-Fletchley',
  'Zacharias Smith',
  'Terry Boot',
  'Michael Corner',
  'Anthony Goldstein',
  'Marietta Edgecombe',
  'Penelope Clearwater',
  'Oliver Wood',
  'Katie Bell',
  'Angelina Johnson',
  'Alicia Spinnet',
  'Lee Jordan',
  'Colin Creevey',
  'Dennis Creevey',
  'Romilda Vane',

  // Death Eaters & Antagonists
  'Tom Riddle',
  'Bellatrix Lestrange',
  'Lucius Malfoy',
  'Narcissa Malfoy',
  'Peter Pettigrew',
  'Barty Crouch Jr',
  'Antonin Dolohov',
  'Fenrir Greyback',
  'Augustus Rookwood',
  'Alecto Carrow',
  'Amycus Carrow',
  'Yaxley',

  // Order of the Phoenix
  'Mad-Eye Moody',
  'Nymphadora Tonks',
  'Kingsley Shacklebolt',
  'Arthur Weasley',
  'Molly Weasley',
  'Bill Weasley',
  'Charlie Weasley',
  'Percy Weasley',
  'Fleur Delacour',
  'Mundungus Fletcher',
  'Elphias Doge',
  'Dedalus Diggle',
  'Hestia Jones',
  'Emmeline Vance',

  // Professors & Staff
  'Horace Slughorn',
  'Pomona Sprout',
  'Filius Flitwick',
  'Sybill Trelawney',
  'Gilderoy Lockhart',
  'Quirinus Quirrell',
  'Dolores Umbridge',
  'Charity Burbage',
  'Argus Filch',
  'Poppy Pomfrey',
  'Rolanda Hooch',
  'Irma Pince',
  'Aurora Sinistra',
  'Septima Vector',
  'Wilhelmina Grubbly-Plank',

  // Other Notable Characters
  'Viktor Krum',
  'Gabrielle Delacour',
  'Olympe Maxime',
  'Igor Karkaroff',
  'Ludo Bagman',
  'Barty Crouch Sr',
  'Cornelius Fudge',
  'Rufus Scrimgeour',
  'Pius Thicknesse',
  'Amelia Bones',
  'Amos Diggory',
  'Xenophilius Lovegood',
  'Ted Tonks',
  'Andromeda Tonks',
  'Gellert Grindelwald',

  // Historical/Founders
  'Godric Gryffindor',
  'Salazar Slytherin',
  'Rowena Ravenclaw',
  'Helga Hufflepuff',
  'Nicolas Flamel',

  // Magical Creatures & Others
  'Dobby',
  'Kreacher',
  'Winky',
  'Griphook',
  'Firenze',
  'Bane',
  'Ronan',
  'Aragog',
  'Buckbeak',
  'Fang',
  'Hedwig',
  'Crookshanks',
  'Scabbers',
  'Fawkes',
  'Nagini',

  // Extended Family
  'Lily Potter',
  'James Potter',
  'Vernon Dursley',
  'Petunia Dursley',
  'Dudley Dursley',
  'Marge Dursley',
  'Regulus Black',
  'Bellatrix Black',
  'Andromeda Black',
  'Walburga Black',
  'Orion Black',
  'Alphard Black',

  // Triwizard & Quidditch
  'Bagman',
  'Diggory',
  'Krum',
  'Fleur',
  'Beauxbatons',
  'Durmstrang',

  // Ministry Workers
  'Umbridge',
  'Fudge',
  'Scrimgeour',
  'Thicknesse',
  'Weasley',
  'Crouch',
  'Bones'
];

/**
 * Get a random Harry Potter character name
 * @returns {string} Random character name
 */
export function getRandomHarryPotterName() {
  const randomIndex = Math.floor(Math.random() * HARRY_POTTER_NAMES.length);
  return HARRY_POTTER_NAMES[randomIndex];
}

/**
 * Get multiple unique random Harry Potter character names
 * @param {number} count - Number of names to get
 * @returns {string[]} Array of unique random character names
 */
export function getRandomHarryPotterNames(count) {
  const shuffled = [...HARRY_POTTER_NAMES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, HARRY_POTTER_NAMES.length));
}
