export const translations = {
  en: {
    select_game: "Select a Game",
    player_setup: "Player Setup",
    num_players: "Number of Players:",
    player_names: "Player Names:",
    start_game: "Start Game",
    name_placeholder: "Enter player name...",
    categories: "Categories",
    total: "Total",
    next_round: "Next Round",
    end_game: "End Game",
    new_game: "New Game",
    resume_game: "Resume Game",
    score: "Score",
    winner: "Winner!",
    language: "Language",
    games_updated: "Games list updated to version {version}",
    settings: "Settings",
    loading: "Loading...",
    cancel: "Cancel",
    confirm_new_game: "Are you sure you want to end this game? Unsaved progress will be lost.",
    filter_all: "All Games",
    filter_selected: "Selected Games"
  },
  uk: {
    select_game: "Оберіть гру",
    player_setup: "Налаштування гравців",
    num_players: "Кількість гравців:",
    player_names: "Імена гравців:",
    start_game: "Почати гру",
    name_placeholder: "Введіть ім'я...",
    categories: "Категорії",
    total: "Всього",
    next_round: "Наступний раунд",
    end_game: "Завершити гру",
    new_game: "Нова гра",
    resume_game: "Продовжити гру",
    score: "Рахунок",
    winner: "Переможець!",
    language: "Мова",
    games_updated: "Список ігор оновлено до версії {version}",
    settings: "Налаштування",
    loading: "Завантаження...",
    cancel: "Скасувати",
    confirm_new_game: "Ви впевнені, що хочете завершити гру? Незбережений прогрес буде втрачено.",
    filter_all: "Усі ігри",
    filter_selected: "Обрані ігри"
  },
  ru: {
    select_game: "Выберите игру",
    player_setup: "Настройка игроков",
    num_players: "Количество игроков:",
    player_names: "Имена игроков:",
    start_game: "Начать игру",
    name_placeholder: "Введите имя...",
    categories: "Категории",
    total: "Итого",
    next_round: "Следующий раунд",
    end_game: "Завершить игру",
    new_game: "Новая игра",
    resume_game: "Продолжить игру",
    score: "Счет",
    winner: "Победитель!",
    language: "Язык",
    games_updated: "Список игр обновлен до версии {version}",
    settings: "Настройки",
    loading: "Загрузка...",
    cancel: "Отмена",
    confirm_new_game: "Вы уверены, что хотите завершить игру? Несохраненный прогресс будет утерян.",
    filter_all: "Все игры",
    filter_selected: "Выбранные"
  }
};

let currentLang = localStorage.getItem('app-lang') || 'uk';

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('app-lang', lang);
    window.dispatchEvent(new CustomEvent('language-changed', { detail: lang }));
  }
}

export function getLanguage() {
  return currentLang;
}

export function t(key, params = {}, defaultText = null) {
  let text = translations[currentLang][key] || translations['en'][key] || defaultText || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}
