// The three levels, drawn as text maps. Each character is one 3×3 square of floor.
//
//   #  wall (a hedge outside, brick inside)     .  floor          +  doorway (floor)
//   M  where Matilda starts                       T  where Miss Trunchbull starts
//   a…h  the order Miss Trunchbull patrols in     B  a library book to collect
//   H  a wardrobe to hide in                      C  a pumpkin checkpoint
//   E  the way out (in the outside wall)          X  crates Matilda can float away with her power
//   D  school desk    S  bookshelf    J  table with a water jug    K  chalkboard    W  swing
//   G  iron railings (outside only)

export const LEVELS = [
  {
    name: 'The Playground at Midnight',
    intro: 'Matilda left her library books at school! Creep across the dark playground and find all 3. Watch out for Miss Trunchbull!',
    outdoor: true,
    map: [
      'GGGGGGGGGGGGGGGGGGGG',
      'GM..C..#....#.....BG',
      'G......#.##.#.###..G',
      'G.##...#B.#...#....G',
      'G.#H......#.W.#.##.G',
      'G.####.####...#..#.G',
      'G......#..a...b..#.G',
      'G.##.#.#.T.....#...G',
      'G.#..#...d.....#.#.G',
      'G.#.H#.#####.c##.#.G',
      'G##..#.#...C...#.#.G',
      'GB.X##.#.#####.#.#HG',
      'G##....#.......#..CE',
      'GGGGGGGGGGGGGGGGGGGG',
    ],
    trunchSpeed: 3.6,
    tips: true,
  },
  {
    name: 'The Creaky Corridors',
    intro: 'Inside the school it is even darker. Find 5 books in the corridors and classrooms. Hide in a wardrobe if she sees you!',
    outdoor: false,
    map: [
      '######################',
      '#M..C#......#....B...#',
      '#....#.D.D..#.SSSS...#',
      '#.H..+......+........#',
      '###.##.D.D..####+#####',
      '#B....##+####...H#...#',
      '#.....#.....J....X.B.#',
      '#.S...+..T..a....#...#',
      '#.S...#.....b....#####',
      '###+###..K..#..X.....#',
      '#..........c+..#..B..#',
      '#.H.C...#####..#.....#',
      '#.......#B..d..+.H..CE',
      '######################',
    ],
    trunchSpeed: 3.9,
  },
  {
    name: "The Headmistress's Hall",
    intro: "This is Miss Trunchbull's own hall. Find the last 5 books, then race for the door. Use your POWER to stop her!",
    outdoor: false,
    map: [
      '########################',
      '#M...#......SSSS......B#',
      '#..C.+..D.D.......D.D..#',
      '#....#..D.D...a...D.D..#',
      '##+###......J.....H....#',
      '#B..H#.###########.#####',
      '#....+.#....K....#.#B..#',
      '#.SS.#.#..T......#.#...#',
      '#....#.#.b....c..+.##X##',
      '###+##.###+#######.....#',
      '#........C......d...C..#',
      '#.D.D.D.......D.D.D....#',
      '#B....H.......J....#..BE',
      '########################',
    ],
    trunchSpeed: 4.2,
    finale: true,
  },
];
