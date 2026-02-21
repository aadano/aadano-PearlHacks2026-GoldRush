const NAMES = {
  appalachian: {
    first: ["Caleb", "Silas", "Elias", "Virgil", "Hezekiah", "Orville", "Clem", "Moses", "Amos", "Fletcher", "Jasper", "Luther", "Rufus", "Gideon", "Ezra"],
    last: ["Holt", "Briggs", "Pruitt", "Calhoun", "Mercer", "Dyer", "Watts", "Bowen", "Slade", "Finch", "Tanner", "Grubb", "Pickett", "Vance", "Coble"]
  },
  irish: {
    first: ["Seamus", "Brendan", "Cormac", "Declan", "Fergus", "Ronan", "Padraig", "Eamon", "Killian", "Niall", "Colm", "Tadhg", "Lorcan", "Conn", "Diarmuid"],
    last: ["Flynn", "Coyle", "Brennan", "Callahan", "Doherty", "Gallagher", "Hennessy", "Malone", "Nolan", "Quinn", "Riordan", "Sheridan", "Tierney", "Walsh", "Byrne"]
  },
  german: {
    first: ["Friedrich", "Heinrich", "Klaus", "Werner", "Dieter", "Gunther", "Ernst", "Karl", "Helmut", "Otto", "Hans", "Rolf", "Gerhard", "Ulrich", "Manfred"],
    last: ["Braun", "Fischer", "Hoffmann", "Koch", "Müller", "Richter", "Schäfer", "Schmitt", "Wagner", "Weber", "Becker", "Hartmann", "Krause", "Lange", "Wolf"]
  },
  chinese: {
    first: ["Wei", "Bao", "Mingzhi", "Jianguo", "Fang", "Hao", "Jianming", "Longwei", "Peng", "Qiang", "Ruiming", "Shaoming", "Tianlong", "Wenbo", "Xiaolong"],
    last: ["Chen", "Li", "Liang", "Liu", "Wang", "Wu", "Xu", "Yang", "Zhang", "Zhao", "Zhou", "Zhu", "Gao", "He", "Hu"]
  },
  mexican: {
    first: ["Carlos", "Joaquín", "Ramón", "Diego", "Alejandro", "Miguel", "Rafael", "Esteban", "Ignacio", "Lorenzo", "Mateo", "Rodrigo", "Salvador", "Tomás", "Vicente"],
    last: ["Reyes", "Vega", "Morales", "Guerrero", "Jiménez", "Mendoza", "Ortega", "Pacheco", "Ríos", "Sandoval", "Torres", "Vargas", "Zamora", "Espinoza", "Fuentes"]
  },
  chilean: {
    first: ["Arturo", "Bernardo", "Cristóbal", "Eduardo", "Francisco", "Gonzalo", "Hernán", "Isidro", "Julio", "Leandro", "Nicolás", "Patricio", "Rodrigo", "Sebastián", "Valentín"],
    last: ["Aguilar", "Bravo", "Castillo", "Delgado", "Figueroa", "Herrera", "Ibáñez", "Lagos", "Medina", "Navarrete", "Ojeda", "Pizarro", "Rojas", "Silva", "Tapia"]
  },
  french: {
    first: ["Étienne", "François", "Gaston", "Henri", "Jacques", "Laurent", "Marcel", "Noël", "Olivier", "Philippe", "Renaud", "Sylvain", "Théodore", "Urbain", "Victor"],
    last: ["Beaumont", "Clément", "Dubois", "Fontaine", "Garnier", "Legrand", "Marchand", "Noiret", "Pelletier", "Renard", "Rousseau", "Thierry", "Vidal", "Blanchard", "Chevalier"]
  },
  black_american: {
    first: ["Samuel", "Elias", "James", "Thomas", "Henry", "George", "William", "John", "Robert", "Charles", "Edward", "Joseph", "David", "Richard", "Arthur"],
    last: ["Freeman", "Washington", "Douglass", "Jefferson", "Lincoln", "Jackson", "Harris", "Bryant", "Coleman", "Daniels", "Edwards", "Garrison", "Holloway", "Moses", "Turner"]
  },
};

const generateName = (ethnicity) => {
  const pool = NAMES[ethnicity] || NAMES.appalachian;
  const first = pool.first[Math.floor(Math.random() * pool.first.length)];
  const last = pool.last[Math.floor(Math.random() * pool.last.length)];
  return { first, last, full: `${first} ${last}` };
};
