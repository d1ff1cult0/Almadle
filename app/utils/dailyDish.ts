import almaFoodData from '../../data/alma_food.json';

// Simple seeded random number generator (Mulberry32)
function mulberry32(a: number) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export function getDailyDish(dateString?: string) {
    // Use provided date or today's date (UTC)
    const date = dateString ? new Date(dateString) : new Date();

    // Create a seed from the date (YYYYMMDD)
    // Ensure we use UTC to be consistent across timezones if needed, 
    // though usually game is local time. 
    // Let's use local date string for simplicity if "daily" means "local day",
    // BUT server and client might differ if passing "date" param.
    // Best to use a standardized string YYYY-MM-DD.

    // If dateString is passed, it is expected to be YYYY-MM-DD.
    // If not, we construct it.

    let seedString = "";
    if (dateString) {
        seedString = dateString.replace(/-/g, '');
    } else {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        seedString = `${year}${month}${day}`;
    }

    const seed = parseInt(seedString);
    const random = mulberry32(seed);

    const randomIndex = Math.floor(random() * almaFoodData.length);
    return almaFoodData[randomIndex];
}
