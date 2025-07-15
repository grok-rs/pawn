import { APP_ROUTES } from '../../constants/appRoutes';
import { PAGE_TITLES } from '../../constants/pageTitles';
import { Tab } from './types';

const assignIds = (tabs: Omit<Tab, 'id'>[], parentId: string = ''): Tab[] => {
  return tabs.map((tab, index) => {
    const id = parentId ? `${parentId}.${index + 1}` : `${index + 1}`;

    return {
      ...tab,
      id: parseFloat(id),
      subTab: tab.subTab ? assignIds(tab.subTab, id) : undefined,
    };
  });
};

const tabs = [
  {
    id: 1,
    name: PAGE_TITLES.OVERVIEW,
    link: APP_ROUTES.TOURNAMENTS,
  },
  {
    id: 2,
    name: PAGE_TITLES.TOURNAMENT_SETTINGS,
    link: APP_ROUTES.TOURNAMENTS,
  },
];

export const TABS: Tab[] = assignIds(tabs);
