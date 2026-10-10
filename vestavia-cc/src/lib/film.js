// Bridge between the film renderer (FilmStage) and the hero's WebGL flyover.
export const filmBus = {
  active: false, // true when the page is being rendered as a film
  heroRender: null, // (t: number) => void, registered by Hero in film mode
};
