import React from 'react';
import SelectDropdown from './ui/SelectDropdown';
import { t } from '../utils/translations';
import { ArrowUpDown } from 'lucide-react';

export default function SortControls({ sortOption, setSortOption, sortDirection, setSortDirection, language }) {
  const combinedValue = `${sortOption}-${sortDirection}`;

  const handleChange = (val) => {
    const [option, direction] = val.split('-');
    setSortOption(option);
    setSortDirection(direction);
  };

  return (
    <div className="flex items-center">
      <SelectDropdown 
        value={combinedValue}
        onChange={handleChange}
        className="w-fit"
        icon={ArrowUpDown}
        options={[
          { value: 'date-desc', label: t('sort_date_desc', language) },
          { value: 'date-asc', label: t('sort_date_asc', language) },
          { value: 'edited-desc', label: t('sort_edited_desc', language) },
          { value: 'edited-asc', label: t('sort_edited_asc', language) },
          { value: 'name-asc', label: t('sort_name_asc', language) },
          { value: 'name-desc', label: t('sort_name_desc', language) },
          { value: 'size-desc', label: t('sort_size_desc', language) },
          { value: 'size-asc', label: t('sort_size_asc', language) }
        ]}
      />
    </div>
  );
}



