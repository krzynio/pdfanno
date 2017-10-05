import objectAssign from 'object-assign'
// TODO fix the import.
import { renderRect, renderRect2 } from './renderRect'
// TODO fix the import.
import renderSpan, { renderSpan2 } from './renderSpan'
import renderText from './renderText'
import renderRelation from './renderRelation'
import renderCircle from './renderCircle'

const isFirefox = /firefox/i.test(navigator.userAgent)

/**
 * Get the x/y translation to be used for transforming the annotations
 * based on the rotation of the viewport.
 *
 * @param {Object} viewport The viewport data from the page
 * @return {Object}
 */
// TODO no need?
function getTranslation (viewport) {
    let x
    let y

    // Modulus 360 on the rotation so that we only
    // have to worry about four possible values.
    switch (viewport.rotation % 360) {
    case 0:
        x = y = 0
        break
    case 90:
        x = 0
        y = (viewport.width / viewport.scale) * -1
        break
    case 180:
        x = (viewport.width / viewport.scale) * -1
        y = (viewport.height / viewport.scale) * -1
        break
    case 270:
        x = (viewport.height / viewport.scale) * -1
        y = 0
        break
    }

    return { x, y }
}

/**
 * Transform the rotation and scale of a node using SVG's native transform attribute.
 *
 * @param {Node} node The node to be transformed
 * @param {Object} viewport The page's viewport data
 * @return {Node}
 */
export function transform (node, viewport, type) {
    let trans = getTranslation(viewport)

    // Let SVG natively transform the element
    if (type === 'span' || type === 'relation' || type === 'area') { // TODO this is all.
        $(node).css('transform', `scale(${viewport.scale}) rotate(${viewport.rotation}) translate(${trans.x}, ${trans.y})`)
    } else {
        node.setAttribute('transform', `scale(${viewport.scale}) rotate(${viewport.rotation}) translate(${trans.x}, ${trans.y})`)
    }

    // Manually adjust x/y for nested SVG nodes
    if (!isFirefox && node.nodeName.toLowerCase() === 'svg' && type !== 'relation') {
        node.setAttribute('x', parseInt(node.getAttribute('x'), 10) * viewport.scale)
        node.setAttribute('y', parseInt(node.getAttribute('y'), 10) * viewport.scale)

        let x = parseInt(node.getAttribute('x', 10))
        let y = parseInt(node.getAttribute('y', 10))
        let width = parseInt(node.getAttribute('width'), 10)
        let height = parseInt(node.getAttribute('height'), 10)
        let path = node.querySelector('path')
        let svg = path.parentNode

        // Scale width/height
        let targets = [ node, svg, path, node.querySelector('rect') ]
        targets.forEach(n => {
            n.setAttribute('width', parseInt(n.getAttribute('width'), 10) * viewport.scale)
            n.setAttribute('height', parseInt(n.getAttribute('height'), 10) * viewport.scale)
        })

        // Transform path but keep scale at 100% since it will be handled natively
        transform(path, objectAssign({}, viewport, { scale : 1 }))

        switch (viewport.rotation % 360) {
        case 90:
            node.setAttribute('x', viewport.width - y - width)
            node.setAttribute('y', x)
            svg.setAttribute('x', 1)
            svg.setAttribute('y', 0)
            break
        case 180:
            node.setAttribute('x', viewport.width - x - width)
            node.setAttribute('y', viewport.height - y - height)
            svg.setAttribute('y', 2)
            break
        case 270:
            node.setAttribute('x', y)
            node.setAttribute('y', viewport.height - x - height)
            svg.setAttribute('x', -1)
            svg.setAttribute('y', 0)
            break
        }
    }

    return node
}

/**
 * Append an annotation as a child of an SVG.
 *
 * @param {SVGElement} svg The SVG element to append the annotation to
 * @param {Object} annotation The annotation definition to render and append
 * @param {Object} viewport The page's viewport data
 * @return {SVGElement} A node that was created and appended by this function
 */
export default function appendChild (svg, annotation, viewport) {
    // TODO no need third argument(viewport) ?
    if (!viewport) {
        viewport = window.PDFView.pdfViewer.getPageView(0).viewport
    }

    let child
    switch (annotation.type) {
    // TODO no need?
    // case 'area':
    //     child = renderRect(annotation, svg)
    //     break
    case 'area':
        child = renderRect2(annotation, svg)
        break
    // TODO no need?
    // case 'span':
    //     child = renderSpan(annotation, svg)
    //     break
    case 'span':
        child = renderSpan2(annotation, svg)
        break
    case 'textbox': // TODO no need?
        child = renderText(annotation, svg)
        break
    case 'relation':
        console.log('rel:', annotation)
        child = renderRelation(annotation, svg)
        break
    case 'circle':  // TODO no need?
        child = renderCircle(annotation, svg)
        break
    }

    // If no type was provided for an annotation it will result in node being null.
    // Skip appending/transforming if node doesn't exist.
    if (child) {

        let elm = transform(child, viewport, annotation.type)

        if (annotation.type === 'textbox') {
            svg.appendChild(elm)

        // `text` show above other type elements.
        } else {

            console.log('type:', annotation.type)

            // TODO
            if (annotation.type === 'span' || annotation.type === 'relation' || annotation.type === 'area') {
                svg.append(elm)

            } else {

                let $text = $('.anno-text-group')
                if ($text.length > 0) {
                    $(elm).insertBefore($text.get(0))
                } else {
                    svg.appendChild(elm)
                }
            }

        }

    }

    return child
}
