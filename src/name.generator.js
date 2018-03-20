/*
 * Fantasy Name Generator
 *
 * Copyright (c) 2014-2015 Victor Nogueira
 * https://github.com/felladrin/fantasy-name-generator
 *
 * Licensed under the MIT License
 * http://opensource.org/licenses/MIT
 */

/**
 * Generates a fantasy name by joining random letters.
 */
function generateName(seed)
{
    let letter = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

    let consonant = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'];

    let vowel = ['a', 'e', 'i', 'o', 'u'];

    let name = [];

    // Number of letters of the name to be generated.
    seed = (seed <= 4)? seed + 5 : seed;

    let numLetters = parseInt(seed);

    let selected;

    for (let i = 0; i < numLetters; i++)
    {
        selected = Math.floor(Math.random() * 26);

        if (name.length > 2)
        {
            let lastLetter = name.length - 1;
            let penultLetter = name.length - 2;

            // If the last two letters are equal, the next one should be different.
            while (name[lastLetter] == selected && name[penultLetter] == selected)
                selected = Math.floor(Math.random() * 26);

            // If the last two letters are consonants, the next one must be a vowel.
            if (consonant.indexOf(name[lastLetter]) != -1 && consonant.indexOf(name[penultLetter]) != -1)
            {
                selected = Math.floor(Math.random() * 5);
                name[i] = vowel[selected];
                continue;
            }
        }
        else
        {
            // If the first letter is a vowel, the second must be a consonant, and vice versa.
            if (vowel.indexOf(name[0]) != -1)
            {
                selected = Math.floor(Math.random() * 21);
                name[i] = consonant[selected];
                continue;
            }
            else if (consonant.indexOf(name[0]) != -1)
            {
                selected = Math.floor(Math.random() * 5);
                name[i] = vowel[selected];
                continue;
            }
        }

        name[i] = letter[selected];
    }

    // Name must not finish with two consonants.
    if (consonant.indexOf(name[name.length - 1]) != -1 && consonant.indexOf(name[name.length - 2]) != -1)
    {
        selected = Math.floor(Math.random() * 5);
        name[name.length - 1] = vowel[selected];
    }

    // Converts the array into a string.
    name = name.join('');

    // Capitalizes the first letter .
    name = name.substr(0, 1).toUpperCase() + name.substr(1);

    // Prints the generated name.
    return name;
}

/**
 * Generates a random hexadecimal number.
 * @returns {string}
 */
function hex()
{
    return parseInt((Math.random() * 255)).toString(16);
}

/**
 * Generates a random color string in the format "#000000".
 * @returns {string}
 */
function randomColor()
{
    return '#' + hex() + hex() + hex();
}

export default generateName;