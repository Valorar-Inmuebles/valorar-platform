/** One coordinator per document; portals participate by their trigger's layer. */
type Layer = {
  root: HTMLElement;
  host: HTMLElement;
  modal: boolean;
  trigger: HTMLElement | null;
  returnTarget?: HTMLElement | null;
  tabBehavior?: "dismiss" | "navigate";
  parent?: Layer;
  onClose: () => void;
  lastFocus?: HTMLElement;
  returnFocus: boolean;
  previousZIndex: string;
};

type LayerOptions = Omit<
  Layer,
  "parent" | "lastFocus" | "returnFocus" | "previousZIndex"
>;
const coordinators = new WeakMap<Document, OverlayCoordinator>();
const focusableSelector =
  'button, input:not([type="hidden"]), select, textarea, a[href], area[href], [tabindex], [contenteditable="true"], audio[controls], video[controls], summary';

function available(element: HTMLElement): boolean {
  if (
    !element.isConnected ||
    element.closest('[inert], [hidden], [aria-hidden="true"]')
  )
    return false;
  if (element.matches(":disabled")) return false;
  const view = element.ownerDocument.defaultView;
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    const style = view?.getComputedStyle(node);
    if (style?.display === "none" || style?.visibility === "hidden")
      return false;
  }
  return true;
}

function tabbables(root: HTMLElement): HTMLElement[] {
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter(
    (element) =>
      (element.tabIndex >= 0 ||
        (element.getAttribute("contenteditable") === "true" &&
          !element.hasAttribute("tabindex"))) &&
      available(element),
  );
  return candidates
    .filter((element) => {
      if (!element.matches('input[type="radio"]')) return true;
      const radio = element as HTMLInputElement;
      if (!radio.name) return true;
      const group = candidates.filter(
        (candidate): candidate is HTMLInputElement =>
          candidate.matches('input[type="radio"]') &&
          (candidate as HTMLInputElement).name === radio.name &&
          (candidate as HTMLInputElement).form === radio.form,
      );
      return (
        (group.find((candidate) => candidate.checked) ?? group[0]) === radio
      );
    })
    .sort(
      (a, b) =>
        (a.tabIndex > 0 ? a.tabIndex : Infinity) -
        (b.tabIndex > 0 ? b.tabIndex : Infinity),
    );
}

function focus(element: HTMLElement | undefined | null): boolean {
  if (!element || !available(element)) return false;
  element.focus({ preventScroll: true });
  return element.ownerDocument.activeElement === element;
}

export function overlayCoordinator(doc: Document): OverlayCoordinator {
  let coordinator = coordinators.get(doc);
  if (!coordinator) {
    coordinator = new OverlayCoordinator(doc);
    coordinators.set(doc, coordinator);
  }
  return coordinator;
}

class OverlayCoordinator {
  private layers: Layer[] = [];
  private isolated = new Map<
    HTMLElement,
    { inert: string | null; hidden: string | null }
  >();
  private observer?: MutationObserver;
  private redirecting = false;
  private previousTrigger: HTMLElement | null = null;
  private dismissedPointerTarget: EventTarget | null = null;

  constructor(private doc: Document) {}

  captureTrigger(): HTMLElement | null {
    const active = this.doc.activeElement as HTMLElement | null;
    // A menu item may disappear in the same commit that opens a modal.
    const floating = [...this.layers]
      .reverse()
      .find((layer) => !layer.modal && layer.root.contains(active));
    if (floating) return floating.returnTarget ?? floating.trigger;
    return active && active !== this.doc.body ? active : this.previousTrigger;
  }

  register(options: LayerOptions): () => void {
    const parent =
      [...this.layers]
        .reverse()
        .find((layer) => layer.root.contains(options.trigger)) ??
      (options.modal ? this.activeModal() : undefined);
    const layer: Layer = {
      ...options,
      parent,
      returnFocus: true,
      previousZIndex: options.host.style.zIndex,
      returnTarget:
        options.returnTarget ??
        (options.trigger?.contains(this.doc.activeElement)
          ? (this.doc.activeElement as HTMLElement)
          : options.trigger),
    };
    this.layers.push(layer);
    if (this.layers.length === 1) this.listen();
    this.sync();
    if (layer.modal) {
      if (
        layer.root.contains(this.doc.activeElement) &&
        available(this.doc.activeElement as HTMLElement)
      ) {
        layer.lastFocus = this.doc.activeElement as HTMLElement;
      } else {
        this.focusLayer(layer);
      }
    }

    return () => {
      const wasTop = this.layers.at(-1) === layer;
      const active = this.doc.activeElement;
      const shouldRestore =
        layer.returnFocus && (wasTop || layer.root.contains(active));
      this.layers = this.layers.filter((item) => item !== layer);
      layer.host.style.zIndex = layer.previousZIndex;
      this.previousTrigger = layer.returnTarget ?? layer.trigger;
      this.sync();
      if (!this.layers.length) this.unlisten();
      // Wait until the entire React commit has removed descendants/registered successors.
      queueMicrotask(() => {
        if (!shouldRestore) return;
        const modal = this.activeModal();
        const current = this.doc.activeElement as HTMLElement | null;
        if (
          current &&
          current !== this.doc.body &&
          available(current) &&
          !layer.root.contains(current) &&
          (!modal || this.insideModal(modal, current))
        )
          return;
        const target = layer.returnTarget ?? layer.trigger;
        if ((!modal || this.insideModal(modal, target)) && focus(target))
          return;
        if (modal) this.focusLayer(modal);
      });
    };
  }

  private activeModal(): Layer | undefined {
    return [...this.layers].reverse().find((layer) => layer.modal);
  }

  private belongsTo(layer: Layer, ancestor: Layer): boolean {
    for (
      let current: Layer | undefined = layer;
      current;
      current = current.parent
    ) {
      if (current === ancestor) return true;
    }
    return false;
  }

  private modalLayers(modal: Layer): Layer[] {
    return this.layers.filter((layer) => this.belongsTo(layer, modal));
  }

  private insideModal(modal: Layer, target: Node | null): boolean {
    return (
      !!target &&
      this.modalLayers(modal).some((layer) => layer.root.contains(target))
    );
  }

  private focusLayer(layer: Layer) {
    const preferred = layer.root.querySelector<HTMLElement>(
      "[autofocus], [data-overlay-autofocus]",
    );
    if (
      !focus(layer.lastFocus) &&
      !focus(preferred) &&
      !focus(tabbables(layer.root)[0])
    )
      focus(layer.root);
  }

  private onFocus = (event: FocusEvent) => {
    if (this.redirecting) return;
    const modal = this.activeModal();
    const target = event.target as HTMLElement;
    if (!modal) return;
    if (this.insideModal(modal, target)) {
      modal.lastFocus = target;
      return;
    }
    // React autoFocus runs during commit, before a new modal's layout effect registers it.
    const opening = target.closest<HTMLElement>("[data-ui-modal]");
    if (opening && !this.layers.some((layer) => layer.root === opening)) return;
    this.redirecting = true;
    this.focusLayer(modal);
    this.redirecting = false;
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    const top = this.layers.at(-1);
    if (!top) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      top.onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const modal = this.activeModal();
    // Leaving a popup by Tab continues at its trigger in the parent's tab order.
    if (!top.modal) {
      const active = this.doc.activeElement as HTMLElement | null;
      if (top.tabBehavior === "navigate" && top.root.contains(active)) {
        const controls = tabbables(top.root);
        const current = controls.indexOf(active!);
        if (controls[current + (event.shiftKey ? -1 : 1)]) return;
      }
      const anchor = top.trigger?.contains(active)
        ? active
        : (top.returnTarget ?? top.trigger);
      top.returnFocus = false;
      top.onClose();
      const candidates = modal
        ? tabbables(modal.root)
        : tabbables(this.doc.body).filter((node) => !top.root.contains(node));
      const index = candidates.findIndex(
        (node) => node === anchor || !!anchor?.contains(node),
      );
      let next = index + (event.shiftKey ? -1 : 1);
      if (modal) next = (next + candidates.length) % candidates.length;
      if (modal || candidates[next]) {
        event.preventDefault();
        focus(candidates[next] ?? modal?.root);
      }
      return;
    }
    if (!modal) return;
    const candidates = this.modalLayers(modal).flatMap((layer) =>
      tabbables(layer.root),
    );
    const active = this.doc.activeElement;
    const index = candidates.findIndex((node) => node === active);
    if (
      !candidates.length ||
      index < 0 ||
      (event.shiftKey ? index === 0 : index === candidates.length - 1)
    ) {
      event.preventDefault();
      focus((event.shiftKey ? candidates.at(-1) : candidates[0]) ?? modal.root);
    }
  };

  private onMouseDown = (event: MouseEvent) => {
    this.dismissedPointerTarget = null;
    const top = this.layers.at(-1);
    if (!top) return;
    const target = event.target as Node;
    if (top.modal) {
      // Backdrop clicks still request closure, but must not blur a refusing modal.
      if (!top.root.contains(target)) event.preventDefault();
      return;
    }
    if (top.root.contains(target) || top.trigger?.contains(target)) return;
    this.dismissedPointerTarget = event.target;
    top.onClose();
    // Dismiss one layer per interaction; don't also click the underlying backdrop.
    if (this.activeModal() && !this.insideModal(this.activeModal()!, target)) {
      event.preventDefault();
    }
  };

  private onClick = (event: MouseEvent) => {
    if (
      event.target === this.dismissedPointerTarget &&
      (event.target as HTMLElement).hasAttribute("data-ui-overlay-backdrop")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.dismissedPointerTarget = null;
  };

  private listen() {
    this.doc.addEventListener("keydown", this.onKeyDown);
    this.doc.addEventListener("focusin", this.onFocus);
    this.doc.addEventListener("mousedown", this.onMouseDown, true);
    this.doc.addEventListener("click", this.onClick, true);
    const Observer = this.doc.defaultView?.MutationObserver;
    if (Observer) {
      this.observer = new Observer(() => this.sync());
      this.observer.observe(this.doc.body, { childList: true, subtree: true });
    }
  }

  private unlisten() {
    this.doc.removeEventListener("keydown", this.onKeyDown);
    this.doc.removeEventListener("focusin", this.onFocus);
    this.doc.removeEventListener("mousedown", this.onMouseDown, true);
    this.doc.removeEventListener("click", this.onClick, true);
    this.observer?.disconnect();
    this.observer = undefined;
  }

  private sync() {
    const modal = this.activeModal();
    this.layers.forEach((layer, index) => {
      layer.host.style.zIndex = String(50 + index * 10);
      if (!layer.modal) return;
      layer.root.setAttribute("aria-modal", String(layer === modal));
      for (const [attribute, selector] of [
        ["aria-labelledby", "[data-ui-dialog-title]"],
        ["aria-describedby", "[data-ui-dialog-description]"],
      ] as const) {
        const id = layer.root.querySelector<HTMLElement>(selector)?.id;
        if (id) layer.root.setAttribute(attribute, id);
        else layer.root.removeAttribute(attribute);
      }
    });
    const wanted = new Set<HTMLElement>();
    if (modal) {
      const allowed = [
        ...this.modalLayers(modal).map((layer) => layer.host),
        ...this.doc.querySelectorAll<HTMLElement>(
          "[data-ui-overlay-announcer]",
        ),
      ];
      const visit = (node: HTMLElement) => {
        if (allowed.includes(node)) return;
        if (allowed.some((root) => node.contains(root))) {
          Array.from(node.children).forEach((child) => {
            if (child instanceof this.doc.defaultView!.HTMLElement)
              visit(child as HTMLElement);
          });
        } else if (!node.matches("script, style, link")) wanted.add(node);
      };
      Array.from(this.doc.body.children).forEach((node) => {
        if (node instanceof this.doc.defaultView!.HTMLElement)
          visit(node as HTMLElement);
      });
    }
    for (const [node, previous] of this.isolated) {
      if (wanted.has(node)) continue;
      if (previous.inert === null) node.removeAttribute("inert");
      else node.setAttribute("inert", previous.inert);
      if (previous.hidden === null) node.removeAttribute("aria-hidden");
      else node.setAttribute("aria-hidden", previous.hidden);
      this.isolated.delete(node);
    }
    for (const node of wanted) {
      if (this.isolated.has(node)) continue;
      this.isolated.set(node, {
        inert: node.getAttribute("inert"),
        hidden: node.getAttribute("aria-hidden"),
      });
      node.setAttribute("inert", "");
      node.setAttribute("aria-hidden", "true");
    }
  }
}
