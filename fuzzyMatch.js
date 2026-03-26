export function fuzzyMatchName(name1, name2) {
    if (!name1 || !name2) return false;

    const normalize = (str) => {
        return str
            .trim()
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9 ]/g, '') // Sadece harf, rakam ve boşluk tut
            .replace(/\s+/g, ' ');      // Fazla boşlukları tek boşluğa indir
    };

    return normalize(name1) === normalize(name2);
}
