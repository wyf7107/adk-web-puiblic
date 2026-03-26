/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Adds hover effects to SVG nodes rendered by Graphviz
 * @param containerSelector - CSS selector for the SVG container element
 * @param onNodeClick - Optional callback when a node is clicked, receives node name
 * @param expandableNodes - Optional set of node names that are expandable/nested
 */
export function addSvgNodeHoverEffects(
  containerSelector: string,
  onNodeClick?: (nodeName: string) => void,
  expandableNodes?: Set<string>
): void {
  const svgContainer = document.querySelector(containerSelector);
  if (!svgContainer) return;

  // Find all node groups in the SVG (Graphviz creates <g class="node"> for each node)
  const nodeElements = svgContainer.querySelectorAll('g.node');

  nodeElements.forEach((nodeElement: Element) => {
    const htmlElement = nodeElement as HTMLElement;

    // Skip legend, START, and END nodes
    const titleElement = nodeElement.querySelector('title');
    const nodeName = titleElement?.textContent || '';
    if (nodeName === '__LEGEND__' || nodeName === '__START__' || nodeName === '__END__') {
      return;
    }

    // Only add hover effects to expandable nodes if expandableNodes set is provided
    if (expandableNodes && !expandableNodes.has(nodeName)) {
      return;
    }

    // Add cursor pointer
    htmlElement.style.cursor = 'pointer';

    // Add hover effect
    htmlElement.addEventListener('mouseenter', () => {
      // Find the shape element (ellipse, polygon, path, rect) inside the node
      const shape = nodeElement.querySelector('ellipse, polygon, path, rect');
      if (shape) {
        (shape as SVGElement).style.stroke = '#42A5F5';
        (shape as SVGElement).style.strokeWidth = '3';
      }
    });

    htmlElement.addEventListener('mouseleave', () => {
      // Reset on mouse leave
      const shape = nodeElement.querySelector('ellipse, polygon, path, rect');
      if (shape) {
        (shape as SVGElement).style.stroke = '';
        (shape as SVGElement).style.strokeWidth = '';
      }
    });

    // Add click handler if callback provided
    if (onNodeClick) {
      htmlElement.addEventListener('click', () => {
        const titleElement = nodeElement.querySelector('title');
        const nodeName = titleElement?.textContent || '';
        if (nodeName) {
          onNodeClick(nodeName);
        }
      });
    }
  });
}
