window.STRUCTURE_LIBRARY = {
  sc: {
    name: "Simple cubic",
    subtitle: "Simple cubic",
    comment: "Simple cubic unit cell, a = 1",
    bonding: { coordination: 6, allowedPairs: [["X", "X"]] },
    planes: [
      { label: "(100)", miller: [1, 0, 0] },
      { label: "(110)", miller: [1, 1, 0] },
      { label: "(111)", miller: [1, 1, 1] }
    ],
    lattice: [
      [1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 1.0]
    ],
    repeats: [4, 4, 4],
    atoms: [
      ["X", 0.0, 0.0, 0.0]
    ]
  },
  bcc: {
    name: "Body-centered cubic",
    subtitle: "Body-centered cubic",
    comment: "BCC unit cell, a = 1",
    bonding: { coordination: 8, allowedPairs: [["X", "X"]] },
    planes: [
      { label: "(100)", miller: [1, 0, 0] },
      { label: "(110)", miller: [1, 1, 0] },
      { label: "(111)", miller: [1, 1, 1] }
    ],
    lattice: [
      [1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 1.0]
    ],
    repeats: [3, 3, 3],
    atoms: [
      ["X", 0.0, 0.0, 0.0],
      ["X", 0.5, 0.5, 0.5]
    ]
  },
  fcc: {
    name: "Face-centered cubic",
    subtitle: "Face-centered cubic",
    comment: "FCC unit cell, a = 1",
    bonding: { coordination: 12, allowedPairs: [["X", "X"]] },
    planes: [
      { label: "(100)", miller: [1, 0, 0] },
      { label: "(110)", miller: [1, 1, 0] },
      { label: "(111)", miller: [1, 1, 1] }
    ],
    lattice: [
      [1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 1.0]
    ],
    repeats: [2, 2, 2],
    atoms: [
      ["X", 0.0, 0.0, 0.0],
      ["X", 0.0, 0.5, 0.5],
      ["X", 0.5, 0.0, 0.5],
      ["X", 0.5, 0.5, 0.0]
    ]
  },
  hcp: {
    name: "Hexagonal close-packed",
    subtitle: "HCP",
    comment: "Ideal HCP unit cell, a = 1 and c/a = sqrt(8/3)",
    bonding: { coordination: 12, allowedPairs: [["X", "X"]] },
    planes: [
      { label: "(0001)", normal: [0, 0, 1] },
      { label: "(10-10)", normal: [1, 0, 0] },
      { label: "(11-20)", normal: [0.5, 0.866025, 0] }
    ],
    lattice: [
      [1.0, 0.0, 0.0],
      [0.5, 0.866025, 0.0],
      [0.0, 0.0, 1.632993]
    ],
    repeats: [3, 3, 3],
    atoms: [
      ["X", 0.0, 0.0, 0.0],
      ["X", 0.666667, 0.577350, 0.816497]
    ]
  },
  diamond: {
    name: "Diamond",
    subtitle: "Diamond cubic",
    comment: "Diamond cubic structure, a = 1",
    bonding: { coordination: 4, allowedPairs: [["C", "C"]], strategy: "mutual-nearest" },
    planes: [
      { label: "(100)", miller: [1, 0, 0] },
      { label: "(110)", miller: [1, 1, 0] },
      { label: "(111)", miller: [1, 1, 1] }
    ],
    lattice: [
      [1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 1.0]
    ],
    repeats: [4, 4, 2],
    atoms: [
      ["C", 0.0, 0.0, 0.0],
      ["C", 0.0, 0.5, 0.5],
      ["C", 0.5, 0.0, 0.5],
      ["C", 0.5, 0.5, 0.0],
      ["C", 0.25, 0.25, 0.25],
      ["C", 0.25, 0.75, 0.75],
      ["C", 0.75, 0.25, 0.75],
      ["C", 0.75, 0.75, 0.25]
    ]
  },
  zb: {
    name: "Zinc blende",
    subtitle: "ZnS",
    comment: "ZnS zinc blende structure, a = 1",
    bonding: { coordination: 4, allowedPairs: [["Zn", "S"]], strategy: "mutual-nearest" },
    planes: [
      { label: "(100)", miller: [1, 0, 0] },
      { label: "(110)", miller: [1, 1, 0] },
      { label: "(111)", miller: [1, 1, 1] }
    ],
    lattice: [
      [1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 1.0]
    ],
    repeats: [2, 2, 2],
    atoms: [
      ["Zn", 0.0, 0.0, 0.0],
      ["Zn", 0.0, 0.5, 0.5],
      ["Zn", 0.5, 0.0, 0.5],
      ["Zn", 0.5, 0.5, 0.0],
      ["S", 0.25, 0.25, 0.25],
      ["S", 0.25, 0.75, 0.75],
      ["S", 0.75, 0.25, 0.75],
      ["S", 0.75, 0.75, 0.25]
    ]
  },
  wz: {
    name: "Wurtzite",
    subtitle: "ZnS",
    comment: "ZnS wurtzite structure, a = 1, ideal c/a and u = 3/8",
    bonding: { coordination: 4, allowedPairs: [["Zn", "S"]], strategy: "mutual-nearest" },
    planes: [
      { label: "(0001)", normal: [0, 0, 1] },
      { label: "(10-10)", normal: [1, 0, 0] },
      { label: "(11-20)", normal: [0.5, 0.866025, 0] }
    ],
    lattice: [
      [1.0, 0.0, 0.0],
      [0.5, 0.866025, 0.0],
      [0.0, 0.0, 1.632993]
    ],
    repeats: [4, 4, 2],
    atoms: [
      ["Zn", 0.0, 0.0, 0.0],
      ["Zn", 0.833333, 0.288675, 0.816497],
      ["S", 0.0, 0.0, 0.612372],
      ["S", 0.833333, 0.288675, 1.428869]
    ]
  },
  graphene: {
    name: "Graphene",
    subtitle: "Primitive cell",
    comment: "Graphene with C-C distance = 1.42 A and 12 A vacuum",
    bonding: { coordination: 3, allowedPairs: [["C", "C"]], strategy: "mutual-nearest" },
    lattice: [
      [2.459512, 0.0, 0.0],
      [1.229756, 2.13, 0.0],
      [0.0, 0.0, 12.0]
    ],
    repeats: [6, 6, 1],
    atoms: [
      ["C", 0.0, 0.0, 6.0],
      ["C", 1.229756, 0.71, 6.0]
    ]
  }
};
