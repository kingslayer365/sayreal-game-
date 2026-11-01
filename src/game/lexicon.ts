import type { Element, Shape } from "./types";

export type Archetype = {
  key: string;
  shape: Shape;
  element: Element;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  mass: number;
  radius: number;
  variant: string;
  flies: boolean;
  explodes: boolean;
  aura: boolean;
  heals: boolean;
  magnet: boolean;
  gravity: boolean;
  ranged: boolean;
  immovable: boolean;
  revive: boolean;
  aggressive: boolean;
  slowAura: boolean;
};

type Row = [string, Shape, Element, number, number, number, number, number, number, string, string];

const ROWS: Row[] = [
  ["dragon", "dragon", "fire", 160, 22, 6, 1.05, 14, 48, "far!", "dragon"],
  ["wyvern", "dragon", "air", 140, 20, 5, 1.15, 12, 46, "far!", "dragon"],
  ["phoenix", "bird", "fire", 120, 16, 4, 1.2, 8, 36, "favr", "phoenix"],
  ["wolf", "beast", "neutral", 100, 16, 4, 1.15, 8, 32, "!", "wolf"],
  ["werewolf", "beast", "shadow", 130, 18, 5, 1.1, 10, 36, "!", "wolf"],
  ["dog", "beast", "neutral", 90, 10, 3, 1.1, 8, 30, "", "dog"],
  ["puppy", "beast", "neutral", 60, 6, 2, 1.2, 4, 22, "", "dog"],
  ["hound", "beast", "neutral", 100, 14, 4, 1.15, 8, 32, "!", "dog"],
  ["cat", "beast", "neutral", 70, 9, 2, 1.35, 5, 26, "", "cat"],
  ["kitten", "beast", "neutral", 48, 5, 1, 1.4, 3, 20, "", "cat"],
  ["lion", "beast", "neutral", 140, 20, 6, 1.05, 14, 40, "!", "cat"],
  ["tiger", "beast", "neutral", 130, 19, 5, 1.2, 12, 38, "!", "cat"],
  ["panther", "beast", "shadow", 110, 18, 4, 1.3, 10, 34, "!", "cat"],
  ["bear", "beast", "neutral", 170, 18, 8, 0.75, 22, 42, "!", "bear"],
  ["panda", "beast", "neutral", 150, 12, 7, 0.7, 20, 40, "", "bear"],
  ["fox", "beast", "neutral", 75, 11, 2, 1.35, 5, 26, "", "fox"],
  ["horse", "beast", "neutral", 120, 12, 4, 1.4, 16, 38, "", "horse"],
  ["unicorn", "beast", "light", 120, 14, 5, 1.35, 14, 38, "h", "horse"],
  ["rabbit", "beast", "neutral", 50, 5, 1, 1.6, 3, 22, "", "bunny"],
  ["bunny", "beast", "neutral", 50, 5, 1, 1.6, 3, 22, "", "bunny"],
  ["elephant", "beast", "earth", 220, 16, 10, 0.55, 40, 52, "", "bear"],
  ["mammoth", "beast", "ice", 240, 18, 10, 0.5, 44, 54, "", "bear"],
  ["shark", "fish", "water", 130, 20, 4, 1.25, 14, 36, "!", "shark"],
  ["fish", "fish", "water", 60, 6, 1, 1.1, 5, 24, "", "fish"],
  ["whale", "fish", "water", 260, 14, 8, 0.6, 50, 58, "", "whale"],
  ["seahorse", "fish", "water", 55, 6, 1, 1, 3, 22, "", "fish"],
  ["bird", "bird", "air", 55, 6, 1, 1.35, 3, 24, "f", "bird"],
  ["eagle", "bird", "air", 80, 14, 3, 1.4, 5, 30, "fr", "eagle"],
  ["hawk", "bird", "air", 75, 13, 2, 1.4, 5, 28, "fr", "eagle"],
  ["crow", "bird", "shadow", 60, 9, 2, 1.3, 4, 26, "f", "bird"],
  ["raven", "bird", "shadow", 70, 11, 2, 1.3, 4, 28, "f", "bird"],
  ["owl", "bird", "air", 70, 10, 3, 1.15, 5, 28, "f", "owl"],
  ["parrot", "bird", "nature", 55, 7, 1, 1.25, 3, 24, "f", "bird"],
  ["bat", "bird", "shadow", 55, 8, 1, 1.4, 3, 24, "f", "bat"],
  ["penguin", "bird", "ice", 80, 8, 4, 0.8, 8, 28, "", "bird"],
  ["chicken", "bird", "neutral", 45, 5, 1, 1.1, 3, 22, "", "chicken"],
  ["duck", "bird", "water", 55, 6, 2, 1.05, 4, 24, "f", "bird"],
  ["snake", "serpent", "neutral", 70, 14, 2, 1.15, 5, 26, "!", "snake"],
  ["serpent", "serpent", "neutral", 90, 15, 3, 1.1, 7, 30, "!", "snake"],
  ["viper", "serpent", "poison", 70, 16, 2, 1.2, 5, 24, "a!", "snake"],
  ["cobra", "serpent", "poison", 80, 16, 3, 1.15, 6, 28, "a!", "snake"],
  ["spider", "bug", "shadow", 65, 12, 3, 1.2, 4, 26, "!", "spider"],
  ["bee", "bug", "air", 40, 8, 1, 1.45, 2, 18, "fa", "bee"],
  ["wasp", "bug", "air", 42, 10, 1, 1.5, 2, 18, "fa!", "bee"],
  ["ant", "bug", "earth", 40, 6, 2, 1.1, 2, 16, "", "ant"],
  ["butterfly", "bug", "air", 36, 3, 0, 1.3, 1, 20, "f", "butterfly"],
  ["crab", "bug", "water", 80, 12, 8, 0.7, 8, 28, "", "crab"],
  ["frog", "beast", "water", 60, 8, 2, 1.15, 4, 24, "", "frog"],
  ["toad", "beast", "poison", 70, 8, 3, 0.8, 6, 26, "a", "frog"],
  ["slime", "blob", "nature", 90, 7, 2, 0.6, 8, 28, "", "slime"],
  ["blob", "blob", "void", 80, 8, 2, 0.55, 8, 28, "", "slime"],
  ["goo", "blob", "poison", 80, 8, 2, 0.55, 8, 26, "a", "slime"],
  ["jelly", "blob", "water", 70, 5, 1, 0.65, 6, 26, "", "slime"],
  ["ghost", "blob", "shadow", 80, 12, 2, 1.2, 3, 28, "f", "ghost"],
  ["spirit", "orb", "light", 70, 10, 2, 1.15, 2, 26, "fh", "spirit"],
  ["wraith", "blob", "shadow", 90, 16, 3, 1.25, 3, 30, "f!", "ghost"],
  ["zombie", "person", "shadow", 120, 12, 4, 0.6, 12, 32, "!", "zombie"],
  ["skeleton", "person", "shadow", 80, 13, 3, 1, 6, 32, "!", "skeleton"],
  ["kraken", "serpent", "water", 200, 22, 8, 0.9, 30, 50, "!", "kraken"],
  ["octopus", "serpent", "water", 110, 14, 4, 0.95, 12, 36, "", "kraken"],
  ["monkey", "beast", "neutral", 80, 10, 2, 1.3, 6, 28, "", "monkey"],
  ["ape", "beast", "neutral", 130, 16, 6, 0.95, 16, 38, "!", "bear"],
  ["pig", "beast", "neutral", 80, 6, 3, 0.8, 10, 28, "", "pig"],
  ["cow", "beast", "neutral", 130, 8, 5, 0.65, 20, 38, "", "cow"],
  ["sheep", "beast", "neutral", 80, 4, 3, 0.75, 8, 30, "", "sheep"],
  ["dinosaur", "beast", "earth", 200, 22, 8, 0.85, 28, 50, "!", "dino"],
  ["dino", "beast", "earth", 190, 21, 7, 0.9, 26, 48, "!", "dino"],
  ["trex", "beast", "earth", 210, 26, 7, 0.95, 26, 50, "!", "dino"],
  ["rex", "beast", "earth", 200, 24, 7, 0.95, 24, 48, "!", "dino"],
  ["knight", "person", "metal", 150, 16, 14, 0.9, 14, 34, "", "knight"],
  ["paladin", "person", "light", 160, 16, 12, 0.9, 14, 34, "h", "knight"],
  ["warrior", "person", "neutral", 130, 16, 8, 1, 12, 34, "!", "warrior"],
  ["fighter", "person", "neutral", 120, 15, 7, 1.05, 11, 32, "!", "warrior"],
  ["barbarian", "person", "neutral", 150, 20, 5, 1, 14, 36, "!", "warrior"],
  ["gladiator", "person", "neutral", 140, 18, 8, 1, 13, 34, "!", "warrior"],
  ["wizard", "person", "void", 90, 18, 3, 0.95, 8, 32, "r", "mage"],
  ["mage", "person", "void", 90, 18, 3, 0.95, 8, 32, "r", "mage"],
  ["witch", "person", "poison", 90, 17, 3, 1, 8, 32, "ra", "mage"],
  ["sorcerer", "person", "void", 95, 19, 3, 0.95, 8, 32, "r", "mage"],
  ["warlock", "person", "shadow", 100, 18, 4, 0.95, 9, 32, "r!", "mage"],
  ["ninja", "person", "shadow", 90, 18, 4, 1.55, 7, 30, "!", "ninja"],
  ["assassin", "person", "shadow", 80, 20, 3, 1.5, 7, 30, "!", "ninja"],
  ["rogue", "person", "neutral", 85, 15, 3, 1.4, 7, 30, "", "ninja"],
  ["robot", "person", "metal", 140, 14, 12, 0.9, 16, 34, "", "robot"],
  ["android", "person", "metal", 130, 14, 10, 1, 14, 32, "", "robot"],
  ["mech", "person", "metal", 200, 18, 14, 0.7, 30, 48, "", "robot"],
  ["cyborg", "person", "metal", 140, 16, 10, 1, 14, 34, "", "robot"],
  ["king", "person", "light", 120, 12, 8, 0.8, 12, 34, "", "royal"],
  ["queen", "person", "light", 120, 13, 8, 0.85, 11, 34, "", "royal"],
  ["prince", "person", "neutral", 100, 12, 6, 1, 10, 32, "", "royal"],
  ["princess", "person", "light", 100, 12, 6, 1.05, 9, 32, "", "royal"],
  ["giant", "person", "earth", 230, 20, 8, 0.6, 36, 56, "", "giant"],
  ["ogre", "person", "earth", 190, 18, 7, 0.65, 28, 48, "!", "giant"],
  ["troll", "person", "nature", 180, 16, 8, 0.6, 26, 46, "v", "giant"],
  ["samurai", "person", "metal", 130, 20, 10, 1.15, 12, 34, "", "samurai"],
  ["archer", "person", "neutral", 90, 15, 3, 1.1, 8, 32, "r", "archer"],
  ["ranger", "person", "nature", 100, 14, 4, 1.15, 8, 32, "r", "archer"],
  ["gunslinger", "person", "metal", 90, 17, 4, 1.1, 9, 32, "r", "gunner"],
  ["cowboy", "person", "earth", 100, 14, 5, 1.05, 10, 32, "r", "gunner"],
  ["doctor", "person", "light", 90, 4, 3, 1, 8, 32, "h", "medic"],
  ["medic", "person", "light", 100, 4, 4, 1, 8, 32, "h", "medic"],
  ["healer", "person", "light", 90, 4, 3, 1, 8, 32, "h", "medic"],
  ["nurse", "person", "light", 85, 4, 3, 1.05, 7, 30, "h", "medic"],
  ["monk", "person", "light", 110, 14, 6, 1.2, 9, 32, "", "monk"],
  ["vampire", "person", "shadow", 120, 16, 5, 1.2, 8, 32, "f!", "vampire"],
  ["angel", "person", "light", 120, 14, 6, 1.15, 8, 34, "fh", "angel"],
  ["demon", "person", "fire", 140, 20, 6, 1.1, 12, 36, "fa!", "demon"],
  ["devil", "person", "fire", 150, 22, 6, 1.1, 12, 36, "fa!", "demon"],
  ["alien", "person", "void", 100, 14, 4, 1.05, 8, 32, "r", "alien"],
  ["pirate", "person", "neutral", 110, 14, 5, 1, 10, 32, "!", "pirate"],
  ["astronaut", "person", "air", 110, 10, 8, 0.9, 12, 34, "f", "astro"],
  ["soldier", "person", "metal", 120, 15, 9, 0.95, 12, 32, "r", "soldier"],
  ["child", "person", "neutral", 50, 4, 1, 1.2, 4, 22, "", "child"],
  ["baby", "person", "neutral", 40, 2, 0, 0.7, 3, 18, "", "child"],
  ["friend", "person", "light", 90, 6, 3, 1, 8, 32, "h", "friend"],
  ["enemy", "person", "shadow", 110, 14, 4, 1, 10, 32, "!", "warrior"],
  ["hero", "person", "light", 140, 16, 8, 1.05, 12, 34, "", "knight"],
  ["villain", "person", "shadow", 130, 18, 6, 1, 12, 34, "!", "demon"],
  ["sword", "blade", "metal", 70, 22, 4, 1.2, 6, 30, "", "sword"],
  ["katana", "blade", "metal", 65, 24, 3, 1.35, 5, 32, "", "sword"],
  ["blade", "blade", "metal", 60, 20, 3, 1.25, 5, 30, "", "sword"],
  ["dagger", "blade", "metal", 45, 16, 1, 1.5, 3, 22, "", "dagger"],
  ["knife", "blade", "metal", 45, 15, 1, 1.45, 3, 22, "", "dagger"],
  ["axe", "blade", "earth", 80, 22, 4, 0.9, 10, 32, "", "axe"],
  ["hammer", "blade", "earth", 90, 20, 6, 0.75, 14, 32, "", "hammer"],
  ["mace", "blade", "metal", 80, 18, 6, 0.8, 12, 30, "", "hammer"],
  ["spear", "blade", "metal", 70, 18, 3, 1.15, 6, 34, "", "spear"],
  ["lance", "blade", "metal", 75, 18, 4, 1.1, 7, 36, "", "spear"],
  ["bow", "blade", "nature", 55, 16, 1, 1.15, 4, 30, "r", "bow"],
  ["arrow", "blade", "nature", 30, 14, 0, 1.5, 2, 20, "r", "bow"],
  ["gun", "blade", "metal", 60, 18, 2, 1, 6, 26, "r", "gun"],
  ["rifle", "blade", "metal", 70, 20, 3, 0.95, 8, 32, "r", "gun"],
  ["pistol", "blade", "metal", 50, 16, 1, 1.1, 4, 22, "r", "gun"],
  ["cannon", "vehicle", "metal", 120, 24, 8, 0.4, 24, 36, "rx", "cannon"],
  ["laser", "blade", "lightning", 50, 20, 1, 1.3, 4, 28, "r", "laser"],
  ["bomb", "bomb", "fire", 50, 28, 0, 0.8, 8, 26, "x", "bomb"],
  ["grenade", "bomb", "fire", 40, 26, 0, 0.9, 6, 20, "x", "bomb"],
  ["tnt", "bomb", "fire", 48, 30, 0, 0.7, 8, 24, "x", "bomb"],
  ["dynamite", "bomb", "fire", 44, 28, 0, 0.75, 7, 24, "x", "bomb"],
  ["explosive", "bomb", "fire", 46, 28, 0, 0.8, 8, 26, "x", "bomb"],
  ["nuke", "bomb", "lightning", 90, 48, 0, 0.5, 20, 36, "x", "nuke"],
  ["missile", "vehicle", "fire", 60, 26, 2, 1.6, 8, 24, "fx", "rocket"],
  ["rocket", "vehicle", "fire", 70, 24, 2, 1.55, 8, 26, "fx", "rocket"],
  ["shield", "shield", "metal", 150, 6, 18, 0.7, 12, 32, "", "shield"],
  ["buckler", "shield", "metal", 90, 8, 12, 1, 6, 24, "", "shield"],
  ["torch", "blade", "fire", 50, 10, 1, 1, 4, 28, "a", "torch"],
  ["candle", "blade", "fire", 30, 4, 0, 0.6, 2, 18, "a", "torch"],
  ["fire", "orb", "fire", 70, 14, 2, 1, 4, 28, "af", "fire"],
  ["flame", "orb", "fire", 65, 14, 1, 1.1, 3, 26, "af", "fire"],
  ["lava", "orb", "fire", 110, 16, 4, 0.6, 16, 34, "a", "fire"],
  ["inferno", "orb", "fire", 100, 20, 3, 1, 6, 36, "af!", "fire"],
  ["magma", "orb", "fire", 120, 15, 5, 0.55, 18, 34, "a", "fire"],
  ["water", "orb", "water", 80, 8, 3, 0.95, 8, 30, "", "water"],
  ["ocean", "orb", "water", 140, 10, 5, 0.7, 20, 44, "", "water"],
  ["wave", "orb", "water", 80, 12, 2, 1.15, 8, 32, "", "water"],
  ["sea", "orb", "water", 120, 10, 4, 0.75, 16, 40, "", "water"],
  ["river", "orb", "water", 70, 7, 2, 1.05, 7, 30, "", "water"],
  ["ice", "orb", "ice", 90, 10, 6, 0.85, 8, 30, "", "ice"],
  ["frost", "orb", "ice", 80, 10, 5, 0.9, 6, 28, "", "ice"],
  ["snow", "orb", "ice", 60, 6, 2, 0.8, 4, 28, "", "ice"],
  ["glacier", "gem", "ice", 160, 10, 10, 0.4, 30, 44, "i", "ice"],
  ["lightning", "orb", "lightning", 70, 20, 2, 1.6, 3, 26, "rf", "lightning"],
  ["thunder", "orb", "lightning", 90, 20, 4, 1.3, 6, 32, "r", "lightning"],
  ["spark", "orb", "lightning", 40, 12, 0, 1.7, 2, 18, "rf", "lightning"],
  ["storm", "orb", "lightning", 110, 18, 4, 1.2, 8, 40, "rf", "storm"],
  ["rock", "gem", "earth", 140, 10, 10, 0.45, 24, 34, "", "rock"],
  ["stone", "gem", "earth", 130, 9, 10, 0.45, 22, 32, "", "rock"],
  ["boulder", "gem", "earth", 180, 12, 12, 0.35, 36, 44, "", "rock"],
  ["mountain", "castle", "earth", 280, 8, 16, 0.2, 80, 60, "i", "mountain"],
  ["wind", "orb", "air", 50, 8, 1, 1.5, 2, 28, "f", "wind"],
  ["tornado", "orb", "air", 100, 16, 3, 1.4, 6, 40, "fg", "wind"],
  ["hurricane", "orb", "air", 130, 16, 4, 1.2, 8, 48, "fg", "wind"],
  ["cloud", "orb", "air", 70, 4, 2, 0.8, 4, 36, "f", "cloud"],
  ["shadow", "orb", "shadow", 80, 14, 3, 1.15, 4, 30, "f", "shadow"],
  ["darkness", "orb", "shadow", 100, 16, 4, 1, 6, 36, "f", "shadow"],
  ["light", "orb", "light", 80, 10, 4, 1.1, 3, 30, "fh", "light"],
  ["sun", "star", "light", 140, 16, 6, 0.9, 16, 42, "a", "sun"],
  ["star", "star", "light", 80, 12, 3, 1.2, 4, 28, "f", "star"],
  ["moon", "star", "air", 100, 10, 5, 0.85, 8, 36, "f", "moon"],
  ["poison", "orb", "poison", 70, 12, 2, 0.95, 5, 28, "a", "poison"],
  ["acid", "orb", "poison", 70, 14, 2, 0.9, 6, 28, "a", "poison"],
  ["toxic", "orb", "poison", 70, 12, 2, 0.95, 5, 28, "a", "poison"],
  ["venom", "orb", "poison", 60, 16, 1, 1.1, 4, 24, "a", "poison"],
  ["earth", "orb", "earth", 120, 8, 8, 0.6, 18, 34, "", "earth"],
  ["mud", "blob", "earth", 100, 6, 4, 0.45, 14, 32, "", "slime"],
  ["crystal", "gem", "light", 90, 12, 6, 0.8, 8, 28, "", "crystal"],
  ["gem", "gem", "light", 70, 8, 4, 0.9, 6, 24, "", "crystal"],
  ["diamond", "gem", "light", 110, 14, 10, 0.85, 10, 26, "", "crystal"],
  ["void", "orb", "void", 90, 16, 4, 1, 5, 32, "f", "void"],
  ["black hole", "orb", "void", 160, 18, 8, 0.5, 40, 44, "g", "void"],
  ["gravity", "orb", "void", 100, 8, 6, 0.5, 20, 32, "g", "void"],
  ["magnet", "gem", "metal", 110, 8, 8, 0.6, 14, 30, "m", "magnet"],
  ["time", "orb", "light", 90, 8, 4, 0.8, 5, 30, "s", "time"],
  ["clock", "gem", "metal", 80, 6, 6, 0.7, 8, 28, "s", "time"],
  ["love", "heart", "light", 90, 4, 3, 1, 4, 30, "h", "love"],
  ["heart", "heart", "light", 80, 4, 2, 1.05, 4, 28, "h", "love"],
  ["hate", "orb", "fire", 90, 18, 3, 1.15, 6, 30, "a!", "hate"],
  ["rage", "orb", "fire", 100, 22, 2, 1.25, 6, 32, "a!", "hate"],
  ["anger", "orb", "fire", 90, 18, 2, 1.2, 6, 30, "!", "hate"],
  ["fury", "orb", "fire", 100, 22, 3, 1.3, 6, 32, "a!", "hate"],
  ["chaos", "orb", "void", 80, 18, 2, 1.3, 5, 32, "x!", "chaos"],
  ["life", "orb", "nature", 100, 6, 4, 1, 4, 30, "h", "life"],
  ["death", "orb", "shadow", 100, 22, 4, 1, 6, 32, "!", "death"],
  ["dream", "orb", "void", 70, 8, 2, 1.1, 2, 30, "f", "dream"],
  ["music", "orb", "air", 60, 6, 2, 1.15, 3, 28, "f", "music"],
  ["song", "orb", "air", 55, 6, 1, 1.2, 2, 26, "f", "music"],
  ["magic", "orb", "void", 80, 16, 3, 1.1, 3, 28, "r", "magic"],
  ["mana", "orb", "void", 70, 12, 2, 1.1, 2, 26, "r", "magic"],
  ["steam", "orb", "air", 50, 6, 1, 1, 2, 28, "f", "cloud"],
  ["tree", "tree", "nature", 160, 6, 6, 0.2, 20, 44, "ih", "tree"],
  ["forest", "tree", "nature", 200, 8, 6, 0.2, 30, 52, "ih", "tree"],
  ["oak", "tree", "nature", 170, 6, 7, 0.2, 22, 46, "ih", "tree"],
  ["pine", "tree", "nature", 140, 6, 5, 0.25, 16, 46, "i", "pine"],
  ["flower", "tree", "nature", 50, 3, 1, 0.4, 2, 22, "h", "flower"],
  ["rose", "tree", "nature", 50, 6, 1, 0.4, 2, 22, "", "flower"],
  ["vine", "serpent", "nature", 80, 8, 2, 0.7, 5, 28, "", "vine"],
  ["plant", "tree", "nature", 70, 4, 2, 0.3, 4, 28, "h", "flower"],
  ["bush", "tree", "nature", 80, 4, 3, 0.25, 6, 30, "", "bush"],
  ["cactus", "tree", "earth", 100, 12, 6, 0.2, 10, 34, "ia", "cactus"],
  ["mushroom", "blob", "poison", 70, 8, 2, 0.3, 5, 26, "a", "shroom"],
  ["castle", "castle", "earth", 300, 8, 16, 0.15, 200, 58, "i", "castle"],
  ["fort", "castle", "earth", 260, 10, 16, 0.15, 180, 54, "i", "castle"],
  ["fortress", "castle", "earth", 320, 10, 18, 0.15, 220, 60, "i", "castle"],
  ["tower", "castle", "earth", 180, 10, 10, 0.2, 40, 36, "i", "tower"],
  ["wall", "castle", "earth", 200, 4, 16, 0.1, 80, 40, "i", "wall"],
  ["house", "castle", "earth", 140, 3, 6, 0.15, 30, 40, "i", "house"],
  ["bunker", "castle", "metal", 240, 8, 18, 0.1, 60, 44, "i", "bunker"],
  ["bridge", "castle", "earth", 160, 2, 8, 0.1, 40, 48, "i", "bridge"],
  ["gate", "castle", "metal", 150, 4, 12, 0.15, 30, 36, "i", "gate"],
  ["car", "vehicle", "metal", 110, 10, 6, 1.35, 16, 32, "", "car"],
  ["truck", "vehicle", "metal", 150, 12, 8, 1, 24, 38, "", "truck"],
  ["bus", "vehicle", "metal", 160, 8, 8, 0.85, 28, 42, "", "bus"],
  ["van", "vehicle", "metal", 120, 8, 6, 1.05, 18, 34, "", "car"],
  ["tank", "vehicle", "metal", 220, 22, 16, 0.55, 40, 40, "r", "tank"],
  ["plane", "vehicle", "air", 100, 12, 4, 1.5, 12, 36, "f", "plane"],
  ["jet", "vehicle", "air", 110, 16, 4, 1.7, 12, 34, "fr", "plane"],
  ["airplane", "vehicle", "air", 120, 12, 5, 1.4, 16, 40, "f", "plane"],
  ["ufo", "vehicle", "void", 120, 16, 6, 1.3, 10, 36, "fr", "ufo"],
  ["spaceship", "vehicle", "void", 140, 16, 8, 1.35, 14, 40, "fr", "ufo"],
  ["spacecraft", "vehicle", "void", 140, 16, 8, 1.3, 14, 40, "fr", "ufo"],
  ["ship", "vehicle", "water", 160, 12, 8, 0.8, 24, 42, "", "ship"],
  ["boat", "vehicle", "water", 90, 6, 4, 1, 10, 32, "", "ship"],
  ["train", "vehicle", "metal", 200, 14, 10, 1.1, 40, 44, "", "train"],
  ["bike", "vehicle", "metal", 60, 8, 2, 1.6, 6, 26, "", "bike"],
  ["motorcycle", "vehicle", "metal", 80, 10, 3, 1.55, 8, 28, "", "bike"],
  ["helicopter", "vehicle", "air", 120, 14, 5, 1.25, 14, 36, "f", "heli"],
  ["heli", "vehicle", "air", 120, 14, 5, 1.25, 14, 36, "f", "heli"],
  ["pizza", "blob", "neutral", 44, 2, 0, 0.5, 4, 26, "h", "food"],
  ["cake", "blob", "neutral", 44, 2, 0, 0.45, 4, 26, "h", "food"],
  ["burger", "blob", "neutral", 48, 3, 1, 0.5, 5, 26, "h", "food"],
  ["bread", "blob", "neutral", 36, 1, 0, 0.4, 3, 22, "h", "food"],
  ["cheese", "blob", "neutral", 36, 2, 0, 0.45, 3, 22, "h", "food"],
  ["cookie", "blob", "neutral", 30, 1, 0, 0.5, 2, 18, "h", "food"],
  ["apple", "blob", "nature", 36, 2, 0, 0.5, 3, 20, "h", "food"],
  ["fruit", "blob", "nature", 36, 2, 0, 0.5, 3, 22, "h", "food"],
  ["pie", "blob", "neutral", 40, 2, 0, 0.45, 4, 24, "h", "food"],
  ["taco", "blob", "neutral", 40, 3, 0, 0.55, 4, 24, "h", "food"],
  ["sushi", "blob", "water", 36, 3, 0, 0.6, 3, 22, "h", "food"],
  ["donut", "blob", "neutral", 34, 1, 0, 0.5, 3, 22, "h", "food"],
  ["doughnut", "blob", "neutral", 34, 1, 0, 0.5, 3, 22, "h", "food"],
  ["chocolate", "blob", "neutral", 36, 2, 0, 0.45, 3, 20, "h", "food"],
  ["pickle", "blob", "nature", 30, 2, 0, 0.5, 2, 20, "h", "food"],
  ["potion", "blob", "light", 44, 2, 0, 0.6, 3, 20, "h", "potion"],
  ["coffee", "blob", "earth", 36, 2, 0, 1.2, 3, 20, "h", "food"],
  ["book", "gem", "neutral", 50, 6, 2, 0.7, 4, 24, "", "book"],
  ["spellbook", "gem", "void", 70, 16, 3, 0.8, 5, 26, "r", "book"],
  ["tome", "gem", "void", 70, 15, 3, 0.75, 5, 26, "r", "book"],
  ["chest", "castle", "earth", 100, 2, 8, 0.2, 14, 30, "", "chest"],
  ["treasure", "gem", "light", 60, 2, 2, 0.5, 8, 26, "", "treasure"],
  ["gold", "gem", "light", 70, 4, 4, 0.5, 12, 24, "", "treasure"],
  ["coin", "gem", "light", 30, 2, 1, 0.8, 3, 16, "", "treasure"],
  ["money", "gem", "light", 40, 2, 1, 0.6, 4, 22, "", "treasure"],
  ["anvil", "castle", "metal", 140, 10, 12, 0.25, 30, 30, "", "anvil"],
  ["balloon", "orb", "air", 30, 2, 0, 1.1, 1, 24, "f", "balloon"],
  ["anchor", "gem", "metal", 100, 10, 8, 0.35, 24, 28, "", "anchor"],
  ["key", "blade", "metal", 30, 6, 1, 1.2, 2, 18, "", "key"],
  ["door", "castle", "earth", 120, 2, 8, 0.15, 16, 36, "i", "door"],
  ["box", "castle", "earth", 80, 2, 4, 0.3, 8, 28, "", "box"],
  ["crate", "castle", "earth", 80, 2, 4, 0.3, 8, 28, "", "box"],
  ["ball", "orb", "neutral", 50, 6, 1, 1.2, 4, 22, "", "ball"],
  ["skull", "gem", "shadow", 60, 10, 4, 0.8, 5, 24, "", "skull"],
  ["crown", "gem", "light", 50, 6, 4, 0.7, 4, 22, "", "crown"],
  ["ring", "gem", "light", 40, 6, 3, 1, 2, 16, "", "ring"],
  ["brick", "gem", "earth", 70, 8, 6, 0.5, 8, 20, "", "rock"],
  ["piano", "castle", "neutral", 90, 4, 4, 0.3, 16, 36, "", "piano"],
  ["drum", "orb", "neutral", 60, 8, 2, 0.7, 6, 26, "", "drum"],
  ["guitar", "blade", "neutral", 50, 6, 1, 1.1, 4, 32, "", "guitar"],
];

function flags(s: string) {
  return {
    flies: s.includes("f"),
    explodes: s.includes("x"),
    aura: s.includes("a"),
    heals: s.includes("h"),
    magnet: s.includes("m"),
    gravity: s.includes("g"),
    ranged: s.includes("r"),
    immovable: s.includes("i"),
    revive: s.includes("v"),
    aggressive: s.includes("!"),
    slowAura: s.includes("s"),
  };
}

export const ARCHETYPES: Archetype[] = ROWS.map((row) => {
  const [key, shape, element, hp, atk, def, spd, mass, radius, flag, variant] = row;
  return { key, shape, element, hp, atk, def, spd, mass, radius, variant, ...flags(flag) };
});

const BY_KEY = new Map<string, Archetype>();
for (const a of ARCHETYPES) BY_KEY.set(a.key, a);

export function archetypeByKey(key: string): Archetype | undefined {
  return BY_KEY.get(key);
}

export const MULTIWORD: Archetype[] = ARCHETYPES.filter((a) => a.key.includes(" ")).sort(
  (a, b) => b.key.length - a.key.length,
);

export const IRREG: Record<string, string> = {
  wolves: "wolf",
  mice: "mouse",
  geese: "goose",
  cacti: "cactus",
  children: "child",
  knives: "knife",
  leaves: "leaf",
};

export function canonical(token: string): string {
  if (IRREG[token]) return IRREG[token];
  if (BY_KEY.has(token)) return token;
  if (token.endsWith("es") && BY_KEY.has(token.slice(0, -2))) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && BY_KEY.has(token.slice(0, -1))) return token.slice(0, -1);
  return token;
}

export function compoundPair(token: string): [Archetype, Archetype] | null {
  if (token.length < 7) return null;
  let prefix: Archetype | null = null;
  let suffix: Archetype | null = null;
  for (const a of ARCHETYPES) {
    if (a.key.includes(" ") || a.key.length < 4) continue;
    if (token.startsWith(a.key) && token.length - a.key.length >= 3) {
      if (!prefix || a.key.length > prefix.key.length) prefix = a;
    }
    if (token.endsWith(a.key) && token.length - a.key.length >= 3) {
      if (!suffix || a.key.length > suffix.key.length) suffix = a;
    }
  }
  if (!prefix || !suffix || prefix.key === suffix.key) return null;
  if (prefix.key.length + suffix.key.length > token.length + 2) return null;
  return [prefix, suffix];
}
