import requests
import pandas as pd
import time
import zipfile
from io import StringIO

base_url = "https://raw.githubusercontent.com/jbryer/brickset/main/data-raw/sets/"
brickset_dfs = []

print("Downloading Brickset data year by year (1970–2024)...")

for year in range(1970, 2025):
    url = f"{base_url}{year}.csv"
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            df = pd.read_csv(StringIO(r.text))

            df["release_year"] = year

            brickset_dfs.append(df)
            print(f"  {year}: {len(df):,} rows, {len(df.columns)} columns")
        else:
            print(f"  {year}: not found (404)")
    except Exception as e:
        print(f"  {year}: error → {e}")

    time.sleep(0.1)

brickset_dataset = pd.concat(brickset_dfs, ignore_index=True, sort=False)

# brickset_dataset.to_csv("rag/data/brickset_dataset.csv", index=False)


print("\nFinal dataset:")
print(f"Rows: {len(brickset_dataset):,}")
print(f"Columns: {len(brickset_dataset.columns)}")




import io 

SETS_URL = "https://cdn.rebrickable.com/media/downloads/sets.csv.zip"
THEMES_URL = "https://cdn.rebrickable.com/media/downloads/themes.csv.zip"

def load_zipped_csv(url):
    r = requests.get(url, timeout=30)
    r.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        csv_name = z.namelist()[0]
        with z.open(csv_name) as f:
            return pd.read_csv(f)

sets_df = load_zipped_csv(SETS_URL)
themes_df = load_zipped_csv(THEMES_URL)

sets_df["theme_id"] = sets_df["theme_id"].astype("Int64")
themes_df["id"] = themes_df["id"].astype("Int64")

rebrickable_dataset = (
    sets_df
    .merge(
        themes_df,
        left_on="theme_id",
        right_on="id",
        how="left"
    )
    .drop(columns=['id'])
    .rename(columns={"name_y": "rebrickable_theme", "name_x": "set_name"})
)

# rebrickable_dataset.to_csv("rag/data/rebrickable_dataset.csv", index=False)


# Join Rebrickable with Brickset
rebrickable_dataset["set_num"] = rebrickable_dataset["set_num"]

# Brickset full set number
brickset_dataset["set_num"] = (
    brickset_dataset["number"].astype(str)
    + "-"
    + brickset_dataset["numberVariant"].astype(str)
)

brickset_dataset  = brickset_dataset[[
    "set_num",
    "theme",
    "themeGroup",
    "subtheme",
    "category",
    "agerange_min"
]]

brickset_dataset = brickset_dataset.rename(columns={"setID": "brickset_setID"})

enriched = rebrickable_dataset.merge(
    brickset_dataset,
    on="set_num",
    how="left"
)

enriched = enriched.drop(columns=['parent_id', 'img_url'])
enriched = enriched.drop_duplicates()
enriched.to_csv("rag/data/enriched.csv", index=False)
