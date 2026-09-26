package com.tufixit.backend.util;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Folds the free-text {@code locationName} artisans type into structured
 * county / town / area values.
 *
 * Kept deliberately lenient: it is a backfill and a convenience for users who do
 * not pick a county explicitly, never a validation gate.
 */
public final class LocationNormalizer {

    public static final List<String> COUNTIES = List.of(
            "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet",
            "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado",
            "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga",
            "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia",
            "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit",
            "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi",
            "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
            "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River",
            "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu",
            "Vihiga", "Wajir", "West Pokot");

    /** Longest first so "Trans Nzoia" wins over any shorter substring match. */
    private static final List<Pattern> COUNTY_PATTERNS = COUNTIES.stream()
            .sorted(Comparator.comparingInt(String::length).reversed())
            .map(county -> Pattern.compile("(?i)(^|[^a-z])" + Pattern.quote(county) + "([^a-z]|$)"))
            .toList();

    private static final List<String> COUNTY_BY_PATTERN_ORDER = COUNTIES.stream()
            .sorted(Comparator.comparingInt(String::length).reversed())
            .toList();

    private static final Pattern NOISE = Pattern.compile("(?i)\\b(kenya|county|town|area|estate|ke)\\b");
    private static final Pattern NON_SLUG = Pattern.compile("[^a-z0-9]+");

    private LocationNormalizer() {
    }

    public record Parsed(String county, String town, String area) {
    }

    public static Parsed parse(String freeText) {
        if (freeText == null || freeText.isBlank()) return new Parsed(null, null, null);

        String county = matchCounty(freeText);

        List<String> remaining = new ArrayList<>();
        for (String part : freeText.split("[,/|]")) {
            String cleaned = clean(part, county);
            if (!cleaned.isEmpty()) remaining.add(cleaned);
        }

        if (remaining.isEmpty()) {
            return new Parsed(county, county, null);
        }
        if (remaining.size() == 1) {
            // A single segment is the town when there is no county to anchor it.
            if (county != null) {
                String area = freeText.matches(".*[,/|].*") ? remaining.get(0) : clean(freeText, null);
                return new Parsed(county, county, area);
            }
            return new Parsed(null, remaining.get(0), null);
        }
        String area = remaining.get(0);
        String town = county != null ? county : remaining.get(remaining.size() - 1);
        return new Parsed(county, town, area);
    }

    /** The place a landing page should be built for: county, else town, else area. */
    public static String canonicalPlace(String county, String town, String area) {
        if (county != null && !county.isBlank()) return county;
        if (town != null && !town.isBlank()) return town;
        if (area != null && !area.isBlank()) return area;
        return null;
    }

    public static String slugify(String value) {
        if (value == null) return null;
        String ascii = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("'", "")
                .toLowerCase(Locale.ROOT);
        String slug = NON_SLUG.matcher(ascii).replaceAll("-").replaceAll("(^-+|-+$)", "");
        return slug.isEmpty() ? null : slug;
    }

    private static String matchCounty(String haystack) {
        for (int i = 0; i < COUNTY_PATTERNS.size(); i++) {
            if (COUNTY_PATTERNS.get(i).matcher(haystack).find()) {
                return COUNTY_BY_PATTERN_ORDER.get(i);
            }
        }
        return null;
    }

    private static String clean(String part, String county) {
        String value = part;
        if (county != null) {
            value = value.replaceAll("(?i)" + Pattern.quote(county), " ");
        }
        value = NOISE.matcher(value).replaceAll(" ");
        value = value.replaceAll("[^A-Za-z' ]", " ").replaceAll("\\s+", " ").trim();
        if (value.length() < 3) return "";
        return titleCase(value);
    }

    private static String titleCase(String value) {
        StringBuilder out = new StringBuilder(value.length());
        boolean atWordStart = true;
        for (char c : value.toCharArray()) {
            out.append(atWordStart ? Character.toUpperCase(c) : Character.toLowerCase(c));
            atWordStart = c == ' ' || c == '\'';
        }
        return out.toString().replaceAll("(?i)\\bCbd\\b", "CBD");
    }
}
