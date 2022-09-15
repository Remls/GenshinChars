from datetime import datetime
import csv

class Version:
    def __init__(self, row: dict):
        self.version_number = row['version']
        self.version_name = row['name']
        self.release_date = row['release_date'] or None

# List of version data, for use with Character.get_version_data()
version_data = {}
with open('data/versions.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        version_data[row["version"]] = Version(row)


class Character:
    def __init__(self, row: dict):
        self.input_row = row
        self.release_version = row['release_version'] or None

        if row['release_date']:
            if row['release_date'] == '?':
                self.release_date = None
            else:
                self.release_date = row['release_date']
        elif self.release_version:
            self.release_date = self.get_version_data().release_date
        else:
            self.release_date = None

    def get_version_data(self) -> Version:
        if self.release_version:
            return version_data[self.release_version]
        return None

    def get_formatted_release_date(self) -> str:
        if self.release_date:
            date = datetime.strptime(self.release_date, "%Y-%m-%d")
            return date.strftime("%Y %B %-d")
        return None

    def __eq__(self, other) -> bool:
        return (self.release_version == other.release_version and
            self.release_date == other.release_date)
    
    def __lt__(self, other) -> bool:
        if self.release_version:
            if other.release_version:
                if self.release_date:
                    if other.release_date:
                        return self.release_date < other.release_date
                    else:
                        # other is bigger because it is None
                        return True
                else:
                    if other.release_date:
                        # self is bigger because it is None
                        return False
                    else:
                        # they are both None, so compare versions now
                        return self.release_version < other.release_version
            else:
                # other is bigger because it is None
                return True
        else:
            # self is bigger because it is None, or
            # they are both None and therefore equal
            return False
