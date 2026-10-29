
export interface DDragonChampion {
  id: string;
  name: string;
  image: string;
}

export interface DDragonItem {
  id: string;
  name: string;
  image: string;
  gold: number;
  tags: string[];
  depth?: number;
  into?: string[];
}

export interface DDragonSummoner {
  id: string;
  name: string;
  image: string;
}

export interface DDragonRune {
  id: string;
  name: string;
  image: string;
}

let currentVersion = '14.8.1';

export async function fetchLatestVersion(): Promise<string> {
  try {
    const response = await fetch('/api/ddragon/versions');
    const versions = await response.json();
    currentVersion = versions[0];
    return currentVersion;
  } catch (error) {
    console.error('Error fetching version:', error);
    return '14.8.1';
  }
}

export async function fetchChampions(): Promise<DDragonChampion[]> {
  try {
    const v = await fetchLatestVersion();
    const response = await fetch(`/api/ddragon/cdn/${v}/data/en_US/champion.json`);
    const data = await response.json();
    return Object.values(data.data).map((champ: any) => ({
      id: champ.id,
      name: champ.name,
      image: `/api/ddragon/cdn/${v}/img/champion/${champ.image.full}`
    }));
  } catch (error) {
    console.error('Error fetching champions:', error);
    return [];
  }
}

export async function fetchItems(): Promise<DDragonItem[]> {
  try {
    const v = await fetchLatestVersion();
    const response = await fetch(`/api/ddragon/cdn/${v}/data/en_US/item.json`);
    const data = await response.json();
    return Object.entries(data.data).map(([id, item]: [string, any]) => ({
      id,
      name: item.name,
      image: `/api/ddragon/cdn/${v}/img/item/${item.image.full}`,
      gold: item.gold.total,
      tags: item.tags || [],
      depth: item.depth,
      into: item.into || []
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    return [];
  }
}

export async function fetchSummoners(): Promise<DDragonSummoner[]> {
  try {
    const v = await fetchLatestVersion();
    const response = await fetch(`/api/ddragon/cdn/${v}/data/en_US/summoner.json`);
    const data = await response.json();
    return Object.values(data.data).map((spell: any) => ({
      id: spell.id,
      name: spell.name,
      image: `/api/ddragon/cdn/${v}/img/spell/${spell.image.full}`
    }));
  } catch (error) {
    console.error('Error fetching summoners:', error);
    return [];
  }
}

export async function fetchRunes(): Promise<DDragonRune[]> {
  try {
    const v = await fetchLatestVersion();
    const response = await fetch(`/api/ddragon/cdn/${v}/data/en_US/runesReforged.json`);
    const data = await response.json();
    
    const runes: DDragonRune[] = [];
    data.forEach((tree: any) => {
      // Add the tree itself (e.g., Precision)
      runes.push({
        id: tree.id.toString(),
        name: tree.name,
        image: `/api/ddragon/cdn/img/${tree.icon}`
      });
      // Add only keystones (first slot)
      if (tree.slots && tree.slots[0]) {
        tree.slots[0].runes.forEach((rune: any) => {
          runes.push({
            id: rune.id.toString(),
            name: rune.name,
            image: `/api/ddragon/cdn/img/${rune.icon}`
          });
        });
      }
    });
    return runes;
  } catch (error) {
    console.error('Error fetching runes:', error);
    return [];
  }
}
