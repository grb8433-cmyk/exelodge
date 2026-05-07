import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@exelodge_favorites';

/**
 * Retrieves the list of favorite property IDs.
 */
export async function getFavorites(): Promise<string[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error reading favorites', e);
    return [];
  }
}

/**
 * Toggles a property ID in the favorites list.
 */
export async function toggleFavorite(id: string): Promise<string[]> {
  try {
    const currentFavorites = await getFavorites();
    const isFav = currentFavorites.includes(id);
    let newFavorites: string[];

    if (isFav) {
      newFavorites = currentFavorites.filter(favId => favId !== id);
    } else {
      newFavorites = [...currentFavorites, id];
    }

    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    return newFavorites;
  } catch (e) {
    console.error('Error toggling favorite', e);
    return [];
  }
}

/**
 * Checks if a property ID is in the favorites list.
 */
export async function isFavorite(id: string): Promise<boolean> {
  const currentFavorites = await getFavorites();
  return currentFavorites.includes(id);
}
